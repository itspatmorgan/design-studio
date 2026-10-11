// Semantic public signatures and referenced local types. Bodies, comments, and private file locations are excluded.
import path from 'node:path';
import ts from 'typescript';
import { API_ENTRIES, API_FOLDER, apiSpecifier } from '../../core/modules/boundaries.ts';

export function publicTypes(root, names) {
  const config = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile);
  if (config.error) throw new Error('Cannot read tsconfig.app.json for the public contract.');
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const resolve = symbol => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
  const local = declaration => declaration.getSourceFile().fileName.startsWith(path.join(root, 'src') + path.sep);
  const visible = property =>
    !property.name.startsWith('#') &&
    !(property.declarations ?? []).some(
      node =>
        ts.canHaveModifiers(node) &&
        ts
          .getModifiers(node)
          ?.some(modifier => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(modifier.kind)),
    );
  const normalize = (text, where) =>
    text.replace(/import\("([^"]+)"\)\.([\w$]+)/g, (whole, specifier, name) => {
      const target = specifier.startsWith('@/')
        ? path.join(root, 'src', specifier.slice(2))
        : specifier.startsWith('#studio/')
          ? path.join(root, API_FOLDER, specifier.slice(8))
          : specifier.startsWith('.')
            ? path.resolve(path.dirname(where.getSourceFile().fileName), specifier)
            : specifier;
      return target.startsWith(path.join(root, 'src') + path.sep) ? name : whole;
    });
  const typeText = (type, where, expand = false) =>
    normalize(
      checker.typeToString(
        type,
        where,
        ts.TypeFormatFlags.NoTruncation | (expand ? ts.TypeFormatFlags.InTypeAlias : 0),
      ),
      where,
    );
  const callText = (call, where) =>
    normalize(checker.signatureToString(call, where, ts.TypeFormatFlags.NoTruncation), where);
  const fieldsOf = (type, where, own) =>
    type
      .getProperties()
      .filter(
        property =>
          visible(property) &&
          property.name !== 'prototype' &&
          (!own || property.declarations?.some(node => own.includes(node.parent))),
      )
      .map(property => {
        const declaration = property.declarations?.[0] ?? where;
        const readonly =
          (ts.canHaveModifiers(declaration) &&
            ts.getModifiers(declaration)?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)) ||
          ((property.declarations ?? []).some(ts.isGetAccessorDeclaration) &&
            !(property.declarations ?? []).some(ts.isSetAccessorDeclaration));
        const name =
          declaration.name && ts.isComputedPropertyName(declaration.name)
            ? ts
                .createPrinter({ removeComments: true })
                .printNode(ts.EmitHint.Unspecified, declaration.name, declaration.getSourceFile())
            : JSON.stringify(property.name);
        return `${readonly ? 'readonly ' : ''}${name}${property.flags & ts.SymbolFlags.Optional ? '?' : ''}: ${typeText(checker.getTypeOfSymbolAtLocation(property, declaration), declaration)}`;
      })
      .sort();
  const symbolType = symbol =>
    symbol.flags & ts.SymbolFlags.Type
      ? checker.getDeclaredTypeOfSymbol(symbol)
      : checker.getTypeOfSymbolAtLocation(symbol, symbol.declarations[0]);
  const signature = symbol => {
    const declaration = symbol.declarations?.[0];
    if (!declaration) throw new Error(`Cannot resolve public declaration ${symbol.name}.`);
    const type = symbolType(symbol);
    let value = symbol.name === 'PLATFORM_VERSION' ? 'string' : typeText(type, declaration, true);
    if (ts.isClassDeclaration(declaration)) {
      const constructor = checker.getTypeOfSymbolAtLocation(symbol, declaration);
      const access = declaration.members
        .find(ts.isConstructorDeclaration)
        ?.modifiers?.find(modifier =>
          [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(modifier.kind),
        );
      value = `${access ? ts.tokenToString(access.kind) + ' ' : ''}${constructor
        .getConstructSignatures()
        .map(call => `new ${callText(call, declaration)}`)
        .join(
          '; ',
        )} { ${fieldsOf(type, declaration).join('; ')} } static { ${fieldsOf(constructor, declaration).join('; ')} }`;
    } else if (ts.isInterfaceDeclaration(declaration)) {
      const own = symbol.declarations;
      const calls = type
        .getCallSignatures()
        .filter(call => own.includes(call.getDeclaration()?.parent))
        .map(call => callText(call, declaration));
      const constructs = type
        .getConstructSignatures()
        .filter(call => own.includes(call.getDeclaration()?.parent))
        .map(call => `new ${callText(call, declaration)}`);
      const indices = checker
        .getIndexInfosOfType(type)
        .filter(index => own.includes(index.declaration?.parent))
        .map(
          index =>
            `${index.isReadonly ? 'readonly ' : ''}[key: ${typeText(index.keyType, declaration)}]: ${typeText(index.type, declaration)}`,
        );
      const bases = own.flatMap(
        node =>
          node.heritageClauses?.flatMap(clause =>
            clause.types.map(base => typeText(checker.getTypeAtLocation(base), declaration)),
          ) ?? [],
      );
      value = `{ ${[...fieldsOf(type, declaration, own), ...calls, ...constructs, ...indices].join('; ')} }${bases.length ? ' extends ' + bases.join(', ') : ''}`;
    }
    const parameters =
      (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) &&
      declaration.typeParameters?.map(parameter => {
        const modifiers = parameter.modifiers?.map(modifier => ts.tokenToString(modifier.kind)).join(' ');
        return `${modifiers ? modifiers + ' ' : ''}${parameter.name.text}${parameter.constraint ? ' extends ' + typeText(checker.getTypeFromTypeNode(parameter.constraint), parameter) : ''}${parameter.default ? ' = ' + typeText(checker.getTypeFromTypeNode(parameter.default), parameter) : ''}`;
      });
    return parameters?.length ? `<${parameters.join(', ')}> ${value}` : value;
  };
  const entries = API_ENTRIES.map(entry => {
    const file = path.join(root, API_FOLDER, `${entry}.ts`);
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`Public entry ${file} is absent from the app type inventory.`);
    const module = checker.getSymbolAtLocation(source);
    return {
      entry: apiSpecifier(entry),
      exports: new Map(checker.getExportsOfModule(module).map(symbol => [symbol.name, resolve(symbol)])),
    };
  });
  // Explicit public annotations take precedence over the policy of a referencing interface.
  const publicNames = new Map();
  for (const { entry, exports } of entries)
    for (const [name, stability] of Object.entries(names[entry])) {
      const symbol = exports.get(name);
      if (!symbol) throw new Error(`Cannot resolve ${entry}.${name}.`);
      if (!publicNames.has(symbol) || stability === 'stable') publicNames.set(symbol, { name, stability });
    }
  const types = {};
  const visited = new Map();
  const collect = (symbol, inherited, scope) => {
    symbol = resolve(symbol);
    const declarations = (symbol.declarations ?? []).filter(local);
    const named = node =>
      ts.isTypeAliasDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name));
    if (!declarations.some(named)) return;
    const policy = publicNames.get(symbol);
    const stability = policy?.stability ?? inherited;
    const key = policy?.name ?? `${scope}.${symbol.name}`;
    if (visited.has(key)) {
      if (visited.get(key) !== symbol)
        throw new Error(`Ambiguous referenced type ${key}; give its declarations distinct names.`);
      return;
    }
    visited.set(key, symbol);
    const visit = node => {
      if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node) || ts.isTypeQueryNode(node)) {
        const reference = checker.getSymbolAtLocation(node.typeName ?? node.expression ?? node.exprName);
        if (reference) collect(reference, stability, scope);
      }
      ts.forEachChild(node, visit);
    };
    const annotations = declaration => {
      if (declaration.type) visit(declaration.type);
      for (const parameter of declaration.parameters ?? []) if (parameter.type) visit(parameter.type);
      for (const parameter of declaration.typeParameters ?? []) {
        if (parameter.constraint) visit(parameter.constraint);
        if (parameter.default) visit(parameter.default);
      }
    };
    for (const declaration of symbol.declarations ?? []) {
      if (!local(declaration)) continue;
      if (
        ts.isTypeAliasDeclaration(declaration) ||
        ts.isInterfaceDeclaration(declaration) ||
        ts.isClassDeclaration(declaration) ||
        ts.isFunctionDeclaration(declaration) ||
        ts.isVariableDeclaration(declaration)
      )
        types[key] = { stability, signature: signature(symbol) };
      if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) visit(declaration);
      else {
        for (const member of ts.isClassDeclaration(declaration) ? declaration.members : []) {
          if (
            !member.modifiers?.some(modifier =>
              [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(modifier.kind),
            )
          )
            annotations(member);
        }
        annotations(declaration);
      }
    }
  };
  // Inferred return types can reach aliases that never appear in an explicit annotation.
  const inferred = (type, inherited, scope, seen) => {
    if (seen.has(type)) return;
    seen.add(type);
    const symbol = type.aliasSymbol ?? type.symbol;
    const stability = symbol ? (publicNames.get(resolve(symbol))?.stability ?? inherited) : inherited;
    if (symbol) collect(symbol, stability, scope);
    const arguments_ = [
      ...(type.aliasTypeArguments ?? []),
      ...(type.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(type) : []),
    ];
    for (const argument of arguments_) inferred(argument, stability, scope, seen);
    if (symbol && !symbol.declarations?.some(local)) return;
    if (type.isUnionOrIntersection()) for (const part of type.types) inferred(part, stability, scope, seen);
    if (!(type.flags & ts.TypeFlags.Object)) return;
    for (const property of type.getProperties().filter(visible)) {
      const where = property.declarations?.[0];
      if (where) inferred(checker.getTypeOfSymbolAtLocation(property, where), stability, scope, seen);
    }
    for (const call of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
      inferred(call.getReturnType(), stability, scope, seen);
      for (const parameter of call.getParameters())
        if (parameter.declarations?.[0])
          inferred(checker.getTypeOfSymbolAtLocation(parameter, parameter.declarations[0]), stability, scope, seen);
    }
  };
  const api = {};
  for (const { entry, exports } of entries) {
    api[entry] = Object.fromEntries(
      Object.entries(names[entry]).map(([name, stability]) => {
        const symbol = exports.get(name),
          scope = `${entry}.${name}`;
        collect(symbol, stability, scope);
        inferred(symbolType(symbol), stability, scope, new Set());
        return [name, { stability, signature: signature(symbol) }];
      }),
    );
  }
  return { api, types: Object.fromEntries(Object.entries(types).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
}
