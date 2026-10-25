// @ts-check
import { serializeCanonical, createDataDigest } from '../domain/serialization.js';
import { validateContentCatalog } from './catalog.js';
import { createHandlerRegistry } from './registry.js';

/** Versioned declarative mod SDK. No dynamic code, global registry mutation or host access. */
const limits = /** @type {Readonly<Record<string, readonly [number, number]>>} */ ({ damage: [0, 500], interval: [0.05, 10], projectileSpeed: [20, 2000], projectileRadius: [1, 40], pellets: [1, 12], spreadRadians: [0, Math.PI * 2], range: [20, 3000], maxHits: [1, 12] });
const idPattern = /^[a-z][a-z0-9_]{1,31}\.[a-z][a-z0-9_-]{1,47}$/;
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
/** @param {object} value @param {readonly string[]} allowed */
function keys(value, allowed) { if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unknown SDK field'); }
/** @param {unknown} value @returns {asserts value is Record<string, any>} */
function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object'); }

/** Parse and strictly validate an API 1.0 local package; unknown features fail closed.
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/serialization.js#serializeCanonical
 * @param {string} text
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} base
 * @returns {import('../contracts.d.ts').ModPackage}
 */
export function parseModPackage(text, base) {
  if (new TextEncoder().encode(text).length > 262144) throw new Error('模组超过256 KiB');
  const pack = JSON.parse(text); serializeCanonical(pack); object(pack);
  keys(pack, ['formatVersion', 'apiVersion', 'id', 'version', 'name', 'author', 'description', 'gameVersion', 'dependencies', 'conflicts', 'patches']);
  if (pack.formatVersion !== 1 || pack.apiVersion !== '1.0' || !idPattern.test(pack.id) || typeof pack.id !== 'string' || typeof pack.version !== 'string' || !versionPattern.test(pack.version)) throw new Error('模组ID或API版本无效');
  if (pack.gameVersion !== base.version || base.modLock?.length) throw new Error('模组与基础游戏版本不兼容');
  for (const field of ['name', 'author', 'description']) if (typeof pack[field] !== 'string' || pack[field].length > (field === 'description' ? 1000 : 100) || (field !== 'description' && !pack[field].trim())) throw new Error(`模组字段无效：${field}`);
  object(pack.dependencies);
  if (Object.keys(pack.dependencies).length > 16 || Object.entries(pack.dependencies).some(([id, version]) => !idPattern.test(id) || id === pack.id || typeof version !== 'string' || !versionPattern.test(version))) throw new Error('模组依赖无效');
  if (!Array.isArray(pack.conflicts) || pack.conflicts.length > 32 || new Set(pack.conflicts).size !== pack.conflicts.length || pack.conflicts.some(id => typeof id !== 'string' || !idPattern.test(id) || id === pack.id)) throw new Error('模组冲突声明无效');
  if (!Array.isArray(pack.patches) || !pack.patches.length || pack.patches.length > 64) throw new Error('模组补丁数量无效');
  const seen = new Set();
  for (const patch of pack.patches) {
    object(patch); keys(patch, ['id', 'displayName', 'parameters']);
    if (typeof patch.id !== 'string' || !Object.hasOwn(base.definitions, patch.id) || !createHandlerRegistry().implementedIds.includes(patch.id) || seen.has(patch.id)) throw new Error('补丁必须指向已实现内容，且每个ID只能出现一次');
    seen.add(patch.id);
    if (patch.displayName !== undefined && (typeof patch.displayName !== 'string' || !patch.displayName.trim() || patch.displayName.length > 80)) throw new Error('显示名无效');
    if (patch.parameters !== undefined) {
      object(patch.parameters);
      if (!['mcp_bubble', 'mcp_fan'].includes(patch.id) || !Object.keys(patch.parameters).length) throw new Error('API 1.0仅开放泡泡/扇面MCP参数');
      for (const [key, value] of Object.entries(patch.parameters)) {
        const bound = limits[key];
        if (!bound || typeof value !== 'number' || !Number.isFinite(value) || value < bound[0] || value > bound[1] || ['pellets', 'maxHits'].includes(key) && !Number.isInteger(value)) throw new Error(`MCP参数超出API范围：${key}`);
      }
    }
    if (patch.displayName === undefined && patch.parameters === undefined) throw new Error('空补丁');
  }
  return structuredClone(/** @type {import('../contracts.d.ts').ModPackage} */(pack));
}

/** Resolve exact dependency versions, conflicts and a deterministic dependency-first order.
 * @calls 无内部公开函数。
 * @param {readonly import('../contracts.d.ts').ModPackage[]} packs
 * @returns {readonly import('../contracts.d.ts').ModPackage[]}
 */
export function resolveModLoadOrder(packs) {
  if (packs.length > 32) throw new Error('最多启用32个模组');
  const byId = new Map(packs.map(pack => [pack.id, pack]));
  if (byId.size !== packs.length) throw new Error('模组ID重复');
  for (const pack of packs) {
    for (const [id, version] of Object.entries(pack.dependencies)) if (byId.get(id)?.version !== version) throw new Error(`${pack.name} 缺少依赖 ${id}@${version}`);
    if (pack.conflicts.some(id => byId.has(id))) throw new Error(`${pack.name} 与已启用模组冲突`);
  }
  const active = new Set(), done = new Set(), ordered = /** @type {import('../contracts.d.ts').ModPackage[]} */([]);
  /** @param {string} id */
  function visit(id) {
    if (active.has(id)) throw new Error('模组依赖成环');
    if (done.has(id)) return;
    active.add(id); const pack = /** @type {import('../contracts.d.ts').ModPackage} */(byId.get(id));
    for (const dependency of Object.keys(pack.dependencies).sort()) visit(dependency);
    active.delete(id); done.add(id); ordered.push(structuredClone(pack));
  }
  for (const id of [...byId.keys()].sort()) visit(id);
  return ordered;
}

/** Compose an immutable run catalog. Conflicting property writes are errors, never silent last-wins.
 * @calls content/catalog.js#validateContentCatalog
 * @calls content/mods.js#parseModPackage
 * @calls content/mods.js#resolveModLoadOrder
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/serialization.js#createDataDigest
 * @calls domain/serialization.js#serializeCanonical
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} base
 * @param {readonly import('../contracts.d.ts').ModPackage[]} packs
 * @returns {import('../contracts.d.ts').ContentCatalog}
 */
export function composeModCatalog(base, packs) {
  if (base.modLock?.length) throw new Error('只能从原版目录组装模组');
  const checked = packs.map(pack => parseModPackage(serializeCanonical(pack), base));
  const ordered = resolveModLoadOrder(checked);
  if (!ordered.length) return structuredClone(base);
  const catalog = /** @type {import('../contracts.d.ts').ContentCatalog} */(structuredClone(base)), writes = new Map();
  for (const pack of ordered) for (const patch of pack.patches) {
    const definition = catalog.definitions[patch.id], fields = { ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}), ...Object.fromEntries(Object.entries(patch.parameters ?? {}).map(([key, value]) => [`parameters.${key}`, value])) };
    for (const [field, value] of Object.entries(fields)) {
      const key = `${patch.id}:${field}`;
      if (writes.has(key)) throw new Error(`模组字段冲突：${key} (${writes.get(key)} / ${pack.id})`);
      writes.set(key, pack.id);
      if (field === 'displayName') definition.displayName = String(value);
      else definition.parameters = { ...definition.parameters, [field.slice('parameters.'.length)]: value };
    }
  }
  catalog.modLock = ordered.map(pack => ({ id: pack.id, version: pack.version, digest: createDataDigest(pack) }));
  catalog.version = `${base.version}+mods.${createDataDigest(catalog.modLock).slice('fnv1a64:'.length)}`;
  for (const definition of Object.values(catalog.definitions)) definition.version = catalog.version;
  // Mechanics share definitions in current catalog, but update explicitly for future independent copies.
  for (const definition of catalog.mechanics) definition.version = catalog.version;
  const report = validateContentCatalog(catalog, createHandlerRegistry());
  if (!report.valid) throw new Error(report.diagnostics.map(item => item.message).join('; '));
  return catalog;
}
