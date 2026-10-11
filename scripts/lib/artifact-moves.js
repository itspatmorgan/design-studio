// References remain readable source. A move changes only references whose old target is known.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { canonicalDirectory } from './safe-paths.js';

const MAX_TEXT = 750 * 1024;
const extensions = [
  '',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.md',
  '.css',
  '.json',
  '/index.tsx',
  '/index.ts',
  '/index.jsx',
  '/index.js',
];
const slash = value => value.split(path.sep).join('/');
const slug = value => value.replace(/\.[^./]+$/, '');
const encode = value => value.split('/').map(encodeURIComponent).join('/');

// No symlinks, hidden files, or dependencies. Keep identities only, not stale file contents.
export function snapshotFiles(dir) {
  const files = new Map();
  const walk = (folder, prefix = '') => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const relative = prefix + entry.name;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file, relative + '/');
      else if (entry.isFile()) {
        const stat = fs.lstatSync(file);
        files.set(relative, `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`);
      }
    }
  };
  walk(dir);
  return files;
}

// Only a unique identity at a missing old path and new path counts. Copies do not count.
export function fileMoves(before, after) {
  const oldById = new Map(),
    newById = new Map();
  for (const [rel, id] of before) oldById.set(id, [...(oldById.get(id) ?? []), rel]);
  for (const [rel, id] of after) newById.set(id, [...(newById.get(id) ?? []), rel]);
  const moves = new Map();
  for (const [id, old] of oldById) {
    const next = newById.get(id);
    if (old.length === 1 && next?.length === 1 && old[0] !== next[0] && !after.has(old[0]) && !before.has(next[0]))
      moves.set(old[0], next[0]);
  }
  return moves;
}

const splitSuffix = value => {
  const at = value.search(/[?#]/);
  return at < 0 ? [value, ''] : [value.slice(0, at), value.slice(at)];
};

export function repairText(text, oldFile, newFile, before, moves, address) {
  const [oldAddress, newAddress = oldAddress] = Array.isArray(address) ? address : [address];
  const urlMoves = new Map([...moves].map(([from, to]) => [slug(from), slug(to)]));
  const relativeTarget = (value, imports = false) => {
    const [raw, suffix] = splitSuffix(value);
    if (!raw || /^(?:[a-z][\w+.-]*:|\/\/|\/)/i.test(raw)) return value;
    if (imports && !raw.startsWith('.')) return value;
    let decoded;
    try {
      decoded = imports ? raw : decodeURIComponent(raw);
    } catch {
      return value;
    }
    const wanted = path.posix.normalize(path.posix.join(path.posix.dirname(oldFile), decoded));
    if (wanted === '..' || wanted.startsWith('../')) return value;
    let target = extensions.map(ext => wanted + ext).find(candidate => before.has(candidate));
    let extensionless = Boolean(target && !imports && slug(target) === wanted);
    if (!target && !imports) {
      target = [...before.keys()].find(file => slug(file) === wanted);
      extensionless = Boolean(target);
    }
    if (!target) return value;
    const mapped = moves.get(target) ?? target;
    if (mapped === target && oldFile === newFile) return value;
    let destination = extensionless ? slug(mapped) : mapped;
    // Extensionless imports stay extensionless; index resolution remains valid.
    if (imports && wanted !== target)
      destination = target.endsWith('/index' + path.posix.extname(target)) ? path.posix.dirname(mapped) : slug(mapped);
    let next = path.posix.relative(path.posix.dirname(newFile), destination);
    if (imports || raw.startsWith('./')) {
      if (!next.startsWith('.')) next = './' + next;
    }
    return (imports ? next : encode(next)) + suffix;
  };
  const appTarget = value => {
    const [raw, suffix] = splitSuffix(value);
    // External URLs remain external, including lookalike paths on another host.
    if (!raw.startsWith('/')) return value;
    let decoded;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return value;
    }
    const aliases = [
      oldAddress,
      oldAddress.startsWith('/prototypes/') ? oldAddress.slice('/prototypes'.length) : oldAddress,
    ];
    const prefix = aliases.find(prefix => decoded.startsWith(prefix + '/') || decoded === prefix);
    if (!prefix) return value;
    const item = decoded.slice(prefix.length + 1);
    const next = urlMoves.get(item) ?? (moves.has(item) ? moves.get(item) : item);
    if (next === item && oldAddress === newAddress) return value;
    return newAddress + (item ? '/' + encode(next) : '') + suffix;
  };
  const link = value => {
    const next = appTarget(value);
    return next !== value ? next : relativeTarget(value);
  };

  if (/\.[cm]?[jt]sx?$/.test(oldFile)) {
    const source = ts.createSourceFile(
      oldFile,
      text,
      ts.ScriptTarget.Latest,
      true,
      oldFile.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const changes = [];
    const visit = node => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const parent = node.parent;
        const imported =
          ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) ||
          (ts.isCallExpression(parent) &&
            parent.arguments[0] === node &&
            (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
              parent.expression.getText(source) === 'require')) ||
          (ts.isNewExpression(parent) && parent.expression.getText(source) === 'URL' && parent.arguments?.[0] === node);
        const attributeParent = ts.isJsxExpression(parent) ? parent.parent : parent;
        const attribute =
          (ts.isJsxAttribute(attributeParent) || ts.isPropertyAssignment(attributeParent)) &&
          ['to', 'href', 'src'].includes(attributeParent.name.getText(source).replace(/['"]/g, ''));
        let next = appTarget(node.text);
        if (!imported && next === node.text) {
          const [target, suffix] = splitSuffix(node.text);
          // Prototype helpers such as ScreenLink/useScreenPath accept paths from the prototype root.
          const mapped = moves.get(target) ?? urlMoves.get(target);
          if (mapped && (target.includes('/') || attribute)) next = mapped + suffix;
        }
        if (next === node.text && imported) {
          if (node.text.startsWith('@' + oldAddress + '/')) {
            const own = node.text.slice(('@' + oldAddress + '/').length);
            next =
              '@' +
              newAddress +
              '/' +
              (moves.get(own) ?? [...moves].find(([from]) => slug(from) === own)?.[1]?.replace(/\.[^./]+$/, '') ?? own);
          } else next = relativeTarget(node.text, true);
        } else if (next === node.text && attribute) next = link(node.text);
        if (next !== node.text) {
          const start = node.getStart(source),
            quote = text[start];
          const escaped = next
            .replace(/\\/g, '\\\\')
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
            .replace(new RegExp(quote, 'g'), '\\' + quote)
            .replace(/\$/g, quote === '`' ? '\\$' : '$');
          changes.push({ start: start + 1, end: node.end - 1, value: escaped });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    for (const change of changes.sort((a, b) => b.start - a.start))
      text = text.slice(0, change.start) + change.value + text.slice(change.end);
    return text;
  }
  if (oldFile.endsWith('.css'))
    return text
      .replace(/(url\(\s*['"]?)([^'")\s]+)(['"]?\s*\))/g, (_, lead, value, tail) => lead + relativeTarget(value) + tail)
      .replace(/(@import\s+['"])([^'"]+)(['"])/g, (_, lead, value, tail) => lead + relativeTarget(value) + tail);
  if (oldFile.endsWith('.md')) {
    // Markdown destinations and reference definitions; leave prose and code fences alone.
    const blocks = text.split(/(^```[^\n]*\n[\s\S]*?^```[^\n]*$|^~~~[^\n]*\n[\s\S]*?^~~~[^\n]*$)/m);
    return blocks
      .map((block, index) =>
        index % 2
          ? block
          : block
              .replace(
                /(!?\[[^\]\n]*\]\()(<[^>\n]+>|[^\s)]+)([^\n]*?\))/g,
                (_, lead, value, tail) =>
                  lead + (value.startsWith('<') ? '<' + link(value.slice(1, -1)) + '>' : link(value)) + tail,
              )
              .replace(
                /^(\s*\[[^\]\n]+\]:\s*)(<[^>\n]+>|\S+)/gm,
                (_, lead, value) => lead + (value.startsWith('<') ? '<' + link(value.slice(1, -1)) + '>' : link(value)),
              ),
      )
      .join('');
  }
  if (oldFile.endsWith('.excalidraw')) {
    let scene;
    try {
      scene = JSON.parse(text);
    } catch {
      return text;
    }
    let changed = false;
    for (const element of scene.elements ?? []) {
      if (typeof element.link !== 'string') continue;
      const next = appTarget(element.link);
      if (next !== element.link) {
        element.link = next;
        element.version = (element.version ?? 0) + 1;
        element.versionNonce = Math.floor(Math.random() * 2 ** 31);
        element.updated = Date.now();
        changed = true;
      }
    }
    return changed ? JSON.stringify(scene, null, 2) + '\n' : text;
  }
  return text;
}

export function repairReferences(dir, before, after, address, moves = fileMoves(before, after)) {
  if (!moves.size && !Array.isArray(address)) return { moves, changes: [] };
  const origin = new Map([...moves].map(([from, to]) => [to, from]));
  const changes = [];
  for (const [relative] of after) {
    if (!/\.(?:[cm]?[jt]sx?|md|excalidraw)$/.test(relative)) continue;
    const file = path.join(dir, relative);
    if (!canonicalDirectory(path.dirname(file), dir))
      throw new Error('A reference file was moved again. Try the move again.');
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_TEXT) continue;
    const content = fs.readFileSync(file, 'utf8');
    const next = repairText(content, origin.get(relative) ?? relative, relative, before, moves, address);
    if (content !== next) changes.push({ file, content, next });
  }
  // Prepare first, then check the current versions before changing any file.
  for (const { file, content } of changes)
    if (fs.readFileSync(file, 'utf8') !== content) throw new Error('A reference changed during the move. Try again.');
  const written = [];
  try {
    for (const change of changes) {
      fs.writeFileSync(change.file, change.next);
      written.push(change);
    }
  } catch (error) {
    for (const change of written) fs.writeFileSync(change.file, change.content);
    throw error;
  }
  return { moves, changes };
}

export const prototypeAddress = dir => {
  const parts = slash(dir).split('/');
  const index = parts.lastIndexOf('prototypes');
  return index >= 0 ? '/prototypes/' + parts.slice(index + 1).join('/') : '/' + parts.slice(-2).join('/');
};
