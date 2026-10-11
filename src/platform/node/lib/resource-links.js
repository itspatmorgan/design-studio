// Repair known browser references without rewriting source imports or prose.
// Mapping is exact, includes containment, and leaves external origins untouched.
import ts from 'typescript';

export function rewriteResourceLinks(text, file, routes, prefixes = new Map(), sceneUpdate = {}) {
  const target = value => {
    const suffixAt = value.search(/[?#]/);
    const route = suffixAt < 0 ? value : value.slice(0, suffixAt);
    const prefix = [...prefixes.keys()].find(prefix => route === prefix || route.startsWith(prefix + '/'));
    const next = routes.get(route) ?? (prefix ? prefixes.get(prefix) + route.slice(prefix.length) : undefined);
    if (next === undefined) sceneUpdate.unresolved?.(route);
    return next === undefined ? value : next + (suffixAt < 0 ? '' : value.slice(suffixAt));
  };
  if (/\.[cm]?[jt]sx?$/.test(file)) {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    if (source.parseDiagnostics.length) throw new Error(`${file}: fix syntax before migrating browser references.`);
    const edits = [];
    const visit = node => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const parent = node.parent;
        const imported =
          ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) ||
          (ts.isCallExpression(parent) &&
            parent.arguments[0] === node &&
            (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
              parent.expression.getText(source) === 'require'));
        const next = imported ? node.text : target(node.text);
        if (next !== node.text) {
          const start = node.getStart(source),
            quote = text[start];
          const value = next
            .replace(/\\/g, '\\\\')
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
            .replace(new RegExp(quote, 'g'), '\\' + quote)
            .replace(/\$/g, quote === '`' ? '\\$' : '$');
          edits.push({ start: start + 1, end: node.end - 1, value });
        }
      }
      if (ts.isTemplateExpression(node)) sceneUpdate.computed?.(node.getText(source));
      ts.forEachChild(node, visit);
    };
    visit(source);
    return edits
      .sort((a, b) => b.start - a.start)
      .reduce((result, edit) => result.slice(0, edit.start) + edit.value + result.slice(edit.end), text);
  }
  if (file.endsWith('.md')) {
    const blocks = text.split(/(^```[^\n]*\n[\s\S]*?^```[^\n]*$|^~~~[^\n]*\n[\s\S]*?^~~~[^\n]*$)/m);
    return blocks
      .map((block, index) =>
        index % 2
          ? block
          : block
              .replace(
                /(!?\[[^\]\n]*\]\()(<[^>\n]+>|[^\s)]+)([^\n]*?\))/g,
                (_, lead, value, tail) =>
                  lead + (value.startsWith('<') ? '<' + target(value.slice(1, -1)) + '>' : target(value)) + tail,
              )
              .replace(
                /^(\s*\[[^\]\n]+\]:\s*)(<[^>\n]+>|\S+)/gm,
                (_, lead, value) =>
                  lead + (value.startsWith('<') ? '<' + target(value.slice(1, -1)) + '>' : target(value)),
              ),
      )
      .join('');
  }
  if (file.endsWith('.excalidraw')) {
    const scene = JSON.parse(text);
    let changed = false;
    for (const element of scene.elements ?? []) {
      if (typeof element.link !== 'string') continue;
      const next = target(element.link);
      if (next !== element.link) {
        const nonce = sceneUpdate.nonce?.(element, next) ?? Math.floor(Math.random() * 2 ** 31);
        element.link = next;
        element.version = (element.version ?? 0) + 1;
        element.versionNonce = nonce;
        element.updated = sceneUpdate.updated ?? Date.now();
        changed = true;
      }
    }
    return changed ? JSON.stringify(scene, null, 2) + '\n' : text;
  }
  return text;
}
