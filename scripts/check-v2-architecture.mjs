import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readV2SourceModel } from './v2-source-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src/v2');
const manifest = JSON.parse(await fs.readFile(path.join(sourceRoot, 'architecture-manifest.json'), 'utf8'));
const modules = new Map(manifest.modules.map(module => [module.path, module]));
const sources = new Map((await readV2SourceModel(sourceRoot)).map(module => [module.path, module]));
const exports = new Map();
const moduleGraph = new Map();
const functionGraph = new Map();
let implemented = 0, placeholders = 0;
const resolveImport = (file, specifier) => path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
const normalizeCall = (file, call) => call.includes('#') ? call : `${file}#${call}`;

async function list(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...await list(path.join(directory, entry.name)));
    else if (entry.name.endsWith('.js')) files.push(path.relative(sourceRoot, path.join(directory, entry.name)).split(path.sep).join('/'));
  }
  return files.sort();
}
assert.deepEqual((await list(sourceRoot)), [...modules.keys()].sort(), 'Manifest must list every JS module');
for (const [file, module] of modules) {
  const source = await fs.readFile(path.join(sourceRoot, file), 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const imported = new Map(), namespaces = new Map();
  const dependencies = [];
  for (const statement of parsed.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier.text;
    assert(specifier.startsWith('.'), `V2 must use local modules or injected ports: ${file}`);
    const dependency = resolveImport(file, specifier);
    assert(modules.has(dependency), `Missing dependency ${dependency}`);
    dependencies.push(dependency);
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.set(bindings.name.text, dependency);
    else if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) imported.set(binding.name.text, `${dependency}#${binding.propertyName?.text ?? binding.name.text}`);
  }
  assert.deepEqual([...new Set(dependencies)].sort(), [...module.dependencies].sort(), `Dependency drift: ${file}`);
  moduleGraph.set(file, dependencies);
  const actualExports = parsed.statements.filter(statement => ts.isFunctionDeclaration(statement) && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword));
  assert.deepEqual(actualExports.map(fn => fn.name.text).sort(), module.functions.map(fn => fn.name).sort(), `Export drift: ${file}`);
  for (const fn of actualExports) {
    const id = `${file}#${fn.name.text}`;
    const contract = module.functions.find(item => item.name === fn.name.text);
    assert.deepEqual(fn.parameters.map(parameter => parameter.name.getText(parsed)), contract.args.map(argument => argument.name), `Signature drift: ${id}`);
    const isTodo = fn.body.statements.length === 1 && ts.isThrowStatement(fn.body.statements[0]) && fn.body.getText(parsed).includes(`TODO V2: ${id}`);
    assert.equal(contract.implementation, isTodo ? 'placeholder' : 'implemented', `Implementation status drift: ${id}`);
    if (isTodo) placeholders++; else implemented++;
    const declaredCalls = contract.calls.map(call => normalizeCall(file, call)).sort();
    if (!isTodo) {
      const actual = sources.get(file).functions.find(item => item.name === fn.name.text);
      assert.deepEqual(actual.actualCalls, declaredCalls, `Call contract drift: ${id}`);
    }
    const comments = source.slice(source.lastIndexOf('/**', fn.getStart(parsed)), fn.getStart(parsed));
    for (const call of declaredCalls) assert(comments.includes(`@calls ${call}`), `Missing @calls ${id} -> ${call}`);
    exports.set(id, contract);
    functionGraph.set(id, declaredCalls);
  }
}
function assertAcyclic(graph, label) {
  const active = new Set(), done = new Set();
  function visit(id) {
    if (done.has(id)) return;
    assert(!active.has(id), `${label} cycle at ${id}`);
    active.add(id);
    for (const dependency of graph.get(id) ?? []) { assert(graph.has(dependency), `Missing ${label} node ${dependency}`); visit(dependency); }
    active.delete(id); done.add(id);
  }
  for (const id of graph.keys()) visit(id);
}
assertAcyclic(moduleGraph, 'module'); assertAcyclic(functionGraph, 'function');
for (const [file, dependencies] of moduleGraph) {
  if (file.startsWith('domain/') || file.startsWith('content/') || file.startsWith('dispatch/')) assert(!dependencies.some(dependency => /^(engine|application|adapters)\//.test(dependency)), `Reverse layer dependency: ${file}`);
  if (file.startsWith('engine/')) assert(!dependencies.some(dependency => /^(application|adapters)\//.test(dependency)), `Engine accesses host: ${file}`);
  if (file.startsWith('application/')) assert(!dependencies.some(dependency => dependency.startsWith('adapters/')), `Application bypasses ports: ${file}`);
}
assert.equal(manifest.bindings.length, 100);
assert.equal(new Set(manifest.bindings.map(binding => binding.id)).size, 100);
for (const binding of manifest.bindings) assert(exports.has(`${binding.module}#${binding.function}`), `Missing binding: ${binding.id}`);
const { createHandlerRegistry } = await import(pathToFileURL(path.join(sourceRoot, 'content/registry.js')).href);
for (const id of createHandlerRegistry().implementedIds) {
  const binding = manifest.bindings.find(binding => binding.id === id);
  assert(binding && exports.get(`${binding.module}#${binding.function}`).implementation === 'implemented', `False implemented capability: ${id}`);
}
assert.equal(manifest.dataDefinitions.length, 36);
assert.equal(new Set(manifest.dataDefinitions.map(definition => definition.id)).size, 36);
assert(!(await fs.readFile(path.join(root, 'src/main.js'), 'utf8')).includes('/v2/'), 'Legacy entry must remain isolated until V2 is playable');
// All remaining placeholders must still fail explicitly. No empty successes.
for (const [file, module] of modules) {
  const loaded = await import(pathToFileURL(path.join(sourceRoot, file)).href);
  for (const fn of module.functions.filter(fn => fn.implementation === 'placeholder')) await assert.rejects(async () => loaded[fn.name](), error => error.message === `TODO V2: ${file}#${fn.name}`);
}
console.log(`V2 architecture: ${modules.size} modules, ${exports.size} functions; ${implemented} implemented, ${placeholders} explicit placeholders; DAG/import/signature/call/binding checks passed.`);
