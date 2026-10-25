import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/** Parse exported interfaces, imports and public calls, including calls via module-private helpers. */
export async function readV2SourceModel(sourceRoot) {
  const files=[];
  async function walk(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const filename=path.join(directory,entry.name);if(entry.isDirectory())await walk(filename);else if(entry.name.endsWith('.js'))files.push(path.relative(sourceRoot,filename).split(path.sep).join('/'));}}
  await walk(sourceRoot);const result=[];
  for(const file of files.sort()){
    const source=await fs.readFile(path.join(sourceRoot,file),'utf8'),parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const named=new Map(),namespaces=new Map(),dependencies=[];
    for(const statement of parsed.statements)if(ts.isImportDeclaration(statement)){
      const specifier=statement.moduleSpecifier.text;
      if(!specifier.startsWith('.'))throw new Error(`External dependency inside V2: ${file}`);
      const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));dependencies.push(dependency);
      const bindings=statement.importClause?.namedBindings;
      if(bindings&&ts.isNamespaceImport(bindings))namespaces.set(bindings.name.text,dependency);
      else if(bindings&&ts.isNamedImports(bindings))for(const binding of bindings.elements)named.set(binding.name.text,`${dependency}#${binding.propertyName?.text??binding.name.text}`);
    }
    const allFunctions=parsed.statements.filter(statement=>ts.isFunctionDeclaration(statement)&&statement.name);
    const publicFunctions=allFunctions.filter(fn=>fn.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword));
    const privateFunctions=new Map(allFunctions.filter(fn=>!publicFunctions.includes(fn)).map(fn=>[fn.name.text,fn]));
    const functions=publicFunctions.map(fn=>{
      const calls=new Set(),privateVisited=new Set();
      function visit(node){
        if(ts.isCallExpression(node)){
          const expression=node.expression;
          if(ts.isIdentifier(expression)){
            if(named.has(expression.text))calls.add(named.get(expression.text));
            else if(publicFunctions.some(other=>other.name.text===expression.text))calls.add(`${file}#${expression.text}`);
            else if(privateFunctions.has(expression.text)&&!privateVisited.has(expression.text)){privateVisited.add(expression.text);visit(privateFunctions.get(expression.text).body);}
          }else if(ts.isPropertyAccessExpression(expression)&&ts.isIdentifier(expression.expression)&&namespaces.has(expression.expression.text))calls.add(`${namespaces.get(expression.expression.text)}#${expression.name.text}`);
          if(ts.isPropertyAccessExpression(expression)&&expression.getText(parsed)==='Math.random')throw new Error(`Ambient randomness in ${file}`);
        }
        ts.forEachChild(node,visit);
      }
      visit(fn.body);
      const todo=fn.body.statements.length===1&&ts.isThrowStatement(fn.body.statements[0])&&fn.body.getText(parsed).includes(`TODO V2: ${file}#${fn.name.text}`);
      const tags=ts.getJSDocParameterTags(fn);
      const simplify=text=>text.replace(/import\(['"][^'"]+['"]\)\./g,'');
      const args=fn.parameters.map(parameter=>({name:parameter.name.getText(parsed),...(parameter.initializer?{default:parameter.initializer.getText(parsed)}:{}),type:simplify(tags.find(tag=>tag.name.getText(parsed)===parameter.name.getText(parsed))?.typeExpression?.type.getText(parsed)??'untyped')}));
      const resultTag=ts.getJSDocReturnTag(fn);
      return {name:fn.name.text,node:fn,async:fn.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.AsyncKeyword)??false,args,result:simplify(resultTag?.typeExpression?.type.getText(parsed)??'void'),implementation:todo?'placeholder':'implemented',actualCalls:[...calls].sort()};
    });
    result.push({path:file,source,parsed,dependencies:[...new Set(dependencies)].sort(),functions});
  }
  return result;
}
