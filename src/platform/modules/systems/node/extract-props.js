// Reads the props of each component a file exports, with the TypeScript compiler, so a props table
// can't drift from the code. It resolves types from other packages (Base UI's Button.Props,
// VariantProps<...>), which a syntax-only reader can't. Takes ~0.4s for a few files.
//
// A prop declared in @types/react or lib.dom is a native attribute of the element ("onClick",
// "aria-label"): there are hundreds, so they're left out and the component is marked `native`.
// Defaults come from the destructured parameter (`{ variant = "default" }`). A description is the
// first sentence of the prop's comment.
import path from 'node:path';
import ts from 'typescript';
import { conciseDescription } from '../docs.ts';

const NATIVE = /[\\/]node_modules[\\/]@types[\\/]react[\\/]|[\\/]typescript[\\/]lib[\\/]lib\./;

function program(files, root) {
  const config = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  return ts.createProgram(files, { ...options, noEmit: true });
}

// The defaults in a component's first parameter, by prop name: { variant: '"default"' }.
function defaultsOf(checker, exported) {
  const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
  const decl = symbol.valueDeclaration;
  let fn = null;
  if (decl && ts.isFunctionDeclaration(decl)) fn = decl;
  else if (decl && ts.isVariableDeclaration(decl) && decl.initializer) {
    let init = decl.initializer;
    while (ts.isCallExpression(init) && init.arguments[0]) init = init.arguments[0]; // memo(...), forwardRef(...)
    if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) fn = init;
  }
  const pattern = fn?.parameters[0]?.name;
  const defaults = {};
  if (pattern && ts.isObjectBindingPattern(pattern)) {
    for (const el of pattern.elements)
      if (el.initializer) defaults[(el.propertyName ?? el.name).getText()] = el.initializer.getText();
  }
  return defaults;
}

// { [absolute file]: [{ name, props: [{ name, type, required, default, description }], native }] }
export function extractProps(files, root) {
  const prog = program(files, root);
  const checker = prog.getTypeChecker();
  const result = {};
  for (const file of files) {
    const source = prog.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    result[file] = [];
    if (!module) continue;
    for (const exported of checker.getExportsOfModule(module)) {
      if (!/^[A-Z]/.test(exported.name)) continue;
      const signature = checker.getTypeOfSymbolAtLocation(exported, source).getCallSignatures()[0];
      if (!signature) continue;
      const param = signature.getParameters()[0];
      const all = param ? checker.getPropertiesOfType(checker.getTypeOfSymbolAtLocation(param, source)) : [];
      const own = all.filter(
        p => !(p.declarations ?? []).length || !p.declarations.every(d => NATIVE.test(d.getSourceFile().fileName)),
      );
      const defaults = defaultsOf(checker, exported);
      result[file].push({
        name: exported.name,
        native: own.length < all.length,
        props: own.map(p => ({
          name: p.name,
          type: checker.typeToString(
            checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(p, source)),
            undefined,
            ts.TypeFormatFlags.NoTruncation,
          ),
          required: !(p.flags & ts.SymbolFlags.Optional),
          default: defaults[p.name] ?? null,
          description: conciseDescription(ts.displayPartsToString(p.getDocumentationComment(checker))),
        })),
      });
    }
  }
  return result;
}
