import ts from 'typescript';
import { removeWorkspace, readWorkspace } from '../scaffold.ts';
import type { Panel } from '../lib/wire.ts';
const moduleName = '@module/dialkit';
const parse = (source: string) => ts.createSourceFile('view.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
export function inspectSource(source: string) {
  const file = parse(source);
  const imports = file.statements.filter(ts.isImportDeclaration).filter(s => ts.isStringLiteral(s.moduleSpecifier) && s.moduleSpecifier.text === moduleName);
  return { attached: !!readWorkspace(source) || imports.length > 0, connected: imports.length > 0 };
}
function resolvedType(config: Record<string, any>): string {
  return `{${Object.entries(config).filter(([key]) => key !== '_collapsed').map(([key, value]) => {
    let type: string;
    if (Array.isArray(value) || typeof value === 'number') type = 'number';
    else if (typeof value === 'boolean') type = 'boolean';
    else if (typeof value === 'string' || ['color','text','select','image'].includes(value.type)) type = 'string';
    else if (value.type === 'pad') type = '{x:number;y:number}';
    else if (value.type === 'spring' || value.type === 'easing') type = '{type:"spring";stiffness?:number;damping?:number;mass?:number;visualDuration?:number;bounce?:number}|{type:"easing";duration:number;ease:[number,number,number,number]}';
    else if (value.type === 'action') type = '{type:"action";label?:string}';
    else type = resolvedType(value);
    return `${JSON.stringify(key)}:${type}`;
  }).join(';')}}`;
}
export function savedConfig(config: Record<string, any>, values: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => {
    const next = values[key];
    if (key === '_collapsed' || value?.type === 'action') return [key, value];
    if (next === undefined) throw Error(`Missing live value for ${key}. Reload this view before saving.`);
    if (Array.isArray(value)) return [key, [next, ...value.slice(1)]];
    if (value && typeof value === 'object') {
      if (['text','color','image','select'].includes(value.type)) return [key,{...value,default:next}];
      if (value.type === 'pad') return [key,{...value,x:[next.x,...(value.x ?? [0,-1,1,.01]).slice(1)],y:[next.y,...(value.y ?? [0,-1,1,.01]).slice(1)]}];
      if (value.type === 'spring' || value.type === 'easing') return [key,next];
      return [key,savedConfig(value,next)];
    }
    return [key,next];
  }));
}
export function transformSource(source: string, panels: Panel[], remove: boolean, assetBase = '', sourcePath='view.tsx') {
  const file = parse(source);
  if ((file as ts.SourceFile & {parseDiagnostics:readonly ts.Diagnostic[]}).parseDiagnostics.length) throw Error('Fix source syntax before saving DialKit.');
  const aliases = new Set<string>(); const typeAliases = new Set<string>();
  const edits: Array<{start:number;end:number;text:string}> = [];
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== moduleName) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) throw Error('Use named DialKit imports before detaching.');
    for (const binding of bindings.elements) {
      const name = (binding.propertyName ?? binding.name).text;
      if (name === 'useBespokeControls') aliases.add(binding.name.text);
      else if (name === 'DialConfig') typeAliases.add(binding.name.text);
      else if (remove) throw Error(`Remove test-only or custom module binding ${name} before detaching this view.`);
    }
    if (remove) edits.push({start:statement.getStart(file),end:statement.end,text:''});
  }
  const candidates=new Set<string>();
  const declarations=new Map<string,ts.Expression>();
  const findDeclarations=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.initializer){if(ts.isIdentifier(node.name))declarations.set(node.name.text,node.initializer);else if(ts.isArrayBindingPattern(node.name))for(const binding of node.name.elements)if(ts.isBindingElement(binding)&&ts.isIdentifier(binding.name))declarations.set(binding.name.text,node.initializer);}ts.forEachChild(node,findDeclarations);};findDeclarations(file);
  const collect=(node:ts.Node)=>{if(ts.isIdentifier(node)&&declarations.has(node.text)&&!candidates.has(node.text)){candidates.add(node.text);collect(declarations.get(node.text)!);}ts.forEachChild(node,collect);};
  const used = new Set<string>();
  const calls=new Map<string,number>();
  const assetImports = new Map<string,string>();
  const existingAssets=new Map<string,string>();
  for(const statement of file.statements)if(ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier)&&statement.importClause?.name){
    const specifier=statement.moduleSpecifier.text;
    const marker=specifier.search(/assets\/(?:image|dialkit)-/);
    if(marker>=0)existingAssets.set(specifier.slice(marker),statement.importClause.name.text);
  }
  const encode = (value: unknown) => JSON.stringify(value, null, 2).replace(/"((?:\/src)?\/prototypes\/[^"\\]+\/assets\/(?:image|dialkit)-[a-f0-9]+\.(?:png|jpg|webp|gif|svg))"/g, (_whole,url) => {
    const canonical=url.replace(/^\/src\//,'/');
    if (!assetBase || !canonical.startsWith(`/prototypes/${assetBase}/assets/`)) throw Error('Image asset belongs to a different prototype.');
    const relative = canonical.slice(`/prototypes/${assetBase}/`.length);
    let name = existingAssets.get(relative)??assetImports.get(relative); if (!name) {let index=assetImports.size;do{name=`dialKitAsset${index++}`;}while(source.includes(name)||[...assetImports.values()].includes(name));assetImports.set(relative,name);}
    return name;
  });
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && aliases.has(node.expression.text)) {
      calls.set(node.expression.text,(calls.get(node.expression.text)??0)+1);
      if(node.arguments[1])collect(node.arguments[1]);
      if(remove && node.arguments[2])collect(node.arguments[2]);
      const name = node.arguments[0];
      if (!name || !ts.isStringLiteral(name)) throw Error('DialKit groups need literal, unique names for source saving.');
      if (used.has(name.text)) throw Error(`Duplicate DialKit group ${name.text}. Give each group a unique name.`);
      used.add(name.text);
      const panel = panels.find(p => p.name === name.text);
      if (!panel || panels.filter(p=>p.name===name.text).length!==1) throw Error(`Open this view and wait for ${name.text} before saving.`);
      edits.push(remove ? {start:node.getStart(file),end:node.end,text:`(${encode(panel.values)} as ${resolvedType(panel.config)})`} : {start:node.arguments[1].getStart(file),end:node.arguments[1].end,text:encode(savedConfig(panel.config,panel.values))});
      return;
    }
    if (remove && ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && typeAliases.has(node.typeName.text)) edits.push({start:node.getStart(file),end:node.end,text:'Record<string, unknown>'});
    ts.forEachChild(node,visit);
  };
  visit(file);
  if (panels.some(panel=>!used.has(panel.name))) throw Error('Rendered dials do not match this source. Reload before saving.');
  // A hook used outside a direct call must never be silently removed.
  if (remove) {
    const count = (name:string) => {let n=0;const walk=(node:ts.Node)=>{if(ts.isIdentifier(node)&&node.text===name)n++;ts.forEachChild(node,walk);};walk(file);return n;};
    for (const alias of aliases) {let imports=0;const visitImport=(node:ts.Node)=>{if(ts.isIdentifier(node)&&node.text===alias)imports++;ts.forEachChild(node,visitImport);};for(const statement of file.statements)if(ts.isImportDeclaration(statement))visitImport(statement);if(count(alias)!==(calls.get(alias)??0)+imports)throw Error('Unsupported DialKit hook reference. Detach it through source editing.');}
  }
  let next=source;
  for(const edit of edits.sort((a,b)=>b.start-a.start)) next=next.slice(0,edit.start)+edit.text+next.slice(edit.end);
  // Asset imports are ordinary Vite imports and remain after module removal.
  const prefix=[...assetImports].map(([file,name])=>`import ${name} from ${JSON.stringify('./'+'../'.repeat(sourcePath.split('/').length-1)+file)};`).join('\n');
  if(remove)next=removeWorkspace(next);
  const nextFile=parse(next);
  const insertion=nextFile.statements[0]?.getStart(nextFile)??next.length;
  if(prefix)next=next.slice(0,insertion)+prefix+'\n'+next.slice(insertion);
  return pruneUnusedDialTypes(pruneUnusedConfigs(next,candidates),typeAliases);
}

function pruneUnusedConfigs(source:string,candidates:Set<string>):string {
  // Ask TypeScript which declarations became unused, without resolving runtime imports.
  // Preserve potentially effectful initializers as expressions rather than guessing them away.
  const pure=(node:ts.Node):boolean=>{
    if(ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isIdentifier(node)||ts.isLiteralExpression(node)||node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword||node.kind===ts.SyntaxKind.NullKeyword)return true;
    if(ts.isSatisfiesExpression(node)||ts.isAsExpression(node)||ts.isParenthesizedExpression(node)||ts.isPrefixUnaryExpression(node))return pure(ts.isPrefixUnaryExpression(node)?node.operand:node.expression);
    if(ts.isArrayLiteralExpression(node))return node.elements.every(pure);
    if(ts.isObjectLiteralExpression(node))return node.properties.every(p=>ts.isPropertyAssignment(p)&&!ts.isComputedPropertyName(p.name)&&pure(p.initializer));
    return false;
  };
  for(let pass=0;pass<candidates.size+1;pass++){
    const file=parse(source);
    const host:ts.CompilerHost={getSourceFile:name=>name==='view.tsx'?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>'',getDirectories:()=>[],fileExists:name=>name==='view.tsx',readFile:()=>source,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
    const program=ts.createProgram(['view.tsx'],{noLib:true,noResolve:true,noUnusedLocals:true,module:ts.ModuleKind.ESNext},host);
    const unused=new Set(program.getSemanticDiagnostics(file).filter(d=>d.code===6133).map(d=>d.start));
    const edits:Array<{start:number;end:number;text:string}>=[];
    const statements:ts.VariableStatement[]=[];
    const gather=(node:ts.Node)=>{if(ts.isVariableStatement(node))statements.push(node);if(ts.isBindingElement(node)&&ts.isArrayBindingPattern(node.parent)&&ts.isIdentifier(node.name)&&!node.initializer&&candidates.has(node.name.text)&&unused.has(node.name.getStart(file)))edits.push({start:node.getStart(file),end:node.end,text:''});ts.forEachChild(node,gather);};gather(file);
    for(const statement of statements){
      if(!ts.isVariableStatement(statement)||statement.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
      const removed=statement.declarationList.declarations.filter(d=>ts.isIdentifier(d.name)&&candidates.has(d.name.text)&&unused.has(d.name.getStart(file)));
      if(!removed.length)continue;
      // Config scaffolds use one declaration per statement. Refuse a compound declaration rather than reorder effects.
      if(statement.declarationList.declarations.length!==1)throw Error('Split compound DialKit config declarations before saving.');
      const initializer=removed[0].initializer;
      edits.push({start:statement.getStart(file),end:statement.end,text:initializer&&!pure(initializer)?`void (${initializer.getText(file)});`:''});
    }
    if(!edits.length)return source;
    for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
  }
  return source;
}

function pruneUnusedDialTypes(source:string,aliases:Set<string>):string {
  const file=parse(source);const referenced=new Set<string>();
  const visit=(node:ts.Node)=>{if(ts.isImportDeclaration(node))return;if(ts.isIdentifier(node))referenced.add(node.text);ts.forEachChild(node,visit);};visit(file);
  const edits:Array<{start:number;end:number;text:string}>=[];const printer=ts.createPrinter({removeComments:true});
  for(const statement of file.statements){
    if(!ts.isImportDeclaration(statement)||!statement.importClause?.namedBindings||!ts.isNamedImports(statement.importClause.namedBindings))continue;
    const clause=statement.importClause;const bindings=clause.namedBindings as ts.NamedImports;
    const keep=bindings.elements.filter(e=>!aliases.has(e.name.text)||referenced.has(e.name.text));
    if(keep.length===bindings.elements.length)continue;
    const next=ts.factory.updateImportDeclaration(statement,statement.modifiers,ts.factory.updateImportClause(clause,clause.isTypeOnly,clause.name,keep.length?ts.factory.updateNamedImports(bindings,keep):undefined),statement.moduleSpecifier,statement.attributes);
    edits.push({start:statement.getStart(file),end:statement.end,text:keep.length||clause.name?printer.printNode(ts.EmitHint.Unspecified,next,file):''});
  }
  for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
  return source;
}
