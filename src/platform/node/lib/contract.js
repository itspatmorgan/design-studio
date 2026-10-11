// Semantic public contract and snapshot freshness. Released compatibility is enforced independently by
// released-contract.js, beginning with the public launch baseline (context/checks.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { publicTypes } from './contract-types.js';
import { API_ENTRIES, API_FOLDER, apiSpecifier } from '../../core/modules/boundaries.ts';
import { SHARED_RUNTIME_PACKAGES, SYSTEM_RUNTIME_PACKAGES } from './system-dependencies.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const SNAPSHOT_FILE = 'src/platform/core/contract.snapshot.json';
export const STABILITY = ['stable', 'experimental'];

const parse = (root, file) =>
  ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);

// The names one export statement adds; `export * from` is refused, since its names would not be listed here.
function statementExports(node, source) {
  if (ts.isExportDeclaration(node)) {
    if (!node.exportClause || !ts.isNamedExports(node.exportClause))
      return { problem: `export * from ${node.moduleSpecifier?.getText(source)}: name each export instead.` };
    return { names: node.exportClause.elements.map(element => element.name.text) };
  }
  if (ts.isExportAssignment(node)) return { problem: 'a default export: name each export instead.' };
  if (!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)))
    return { names: [] };
  if (ts.isVariableStatement(node))
    return { names: node.declarationList.declarations.map(d => d.name.getText(source)) };
  return { names: node.name ? [node.name.text] : [] };
}

// The @stable or @experimental tag in the JSDoc comment directly before a statement, with its description.
function stabilityOf(node, source) {
  const comments = ts.getLeadingCommentRanges(source.text, node.pos) ?? [];
  const last = comments.at(-1);
  const text = last && source.text.slice(last.pos, last.end);
  const match = text?.match(/^\/\*\*\s*@(stable|experimental)\b\s*([^*]*?)\s*\*\/$/);
  return match && match[2] ? match[1] : null;
}

// Every export of one API entry file, by name, with its stability: { names: { Name: 'stable' }, problems: [] }.
export function apiExports(source) {
  const names = {};
  const problems = [];
  for (const node of source.statements) {
    const found = statementExports(node, source);
    if (found.problem) {
      problems.push(`${source.fileName}: ${found.problem}`);
      continue;
    }
    if (!found.names.length) continue;
    const stability = stabilityOf(node, source);
    if (!stability)
      problems.push(
        `${source.fileName}: ${found.names.join(', ')} needs a /** @stable ... */ or /** @experimental ... */ comment with a one-line description.`,
      );
    for (const name of found.names) names[name] = stability;
  }
  return {
    names: Object.fromEntries(Object.entries(names).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    problems,
  };
}

// What is wrong with the API folder itself: a file for every entry, an entry for every file, and tagged exports.
export function apiProblems(root = ROOT) {
  const files = fs
    .readdirSync(path.join(root, API_FOLDER))
    .filter(file => file.endsWith('.ts'))
    .map(file => file.replace(/\.ts$/, ''));
  return [
    ...API_ENTRIES.filter(entry => !files.includes(entry)).map(
      entry =>
        `${API_FOLDER}/${entry}.ts is missing, but API_ENTRIES (src/platform/core/modules/boundaries.ts) lists it.`,
    ),
    ...files
      .filter(file => !API_ENTRIES.includes(file))
      .map(file => `${API_FOLDER}/${file}.ts is not in API_ENTRIES (src/platform/core/modules/boundaries.ts).`),
    ...API_ENTRIES.filter(entry => files.includes(entry)).flatMap(
      entry => apiExports(parse(root, `${API_FOLDER}/${entry}.ts`)).problems,
    ),
  ];
}

export const SNAPSHOT_VERSION = 2;
export const FIRST_PUBLIC_RELEASE = '0.3.0';

export function computeContract(root = ROOT) {
  const names = Object.fromEntries(
    API_ENTRIES.map(entry => [apiSpecifier(entry), apiExports(parse(root, `${API_FOLDER}/${entry}.ts`)).names]),
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const version = fs
    .readFileSync(path.join(root, 'src/platform/core/modules/index.ts'), 'utf8')
    .match(/export const PLATFORM_VERSION = '([^']+)'/)?.[1];
  if (!version) throw new Error('Cannot read PLATFORM_VERSION.');
  const formats = parse(root, 'src/platform/core/formats.ts');
  const declaration = formats.statements
    .flatMap(node => (ts.isVariableStatement(node) ? [...node.declarationList.declarations] : []))
    .find(node => node.name.getText(formats) === 'FORMAT_VERSIONS');
  let value = declaration?.initializer;
  if (value && ts.isAsExpression(value)) value = value.expression;
  if (!value || !ts.isObjectLiteralExpression(value)) throw new Error('FORMAT_VERSIONS must declare literal versions.');
  const formatVersions = Object.fromEntries(
    value.properties.map(property => {
      if (!ts.isPropertyAssignment(property) || !ts.isNumericLiteral(property.initializer))
        throw new Error('FORMAT_VERSIONS must declare literal numeric versions.');
      return [property.name.getText(formats), Number(property.initializer.text)];
    }),
  );
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    platformVersion: version,
    formatVersions,
    ...publicTypes(root, names),
    runtimePackages: { shared: [...SHARED_RUNTIME_PACKAGES], system: [...SYSTEM_RUNTIME_PACKAGES] },
    runtimeRequirements: {
      node: pkg.engines.node,
      pnpm: pkg.engines.pnpm,
      react: pkg.dependencies.react,
      reactDom: pkg.dependencies['react-dom'],
    },
  };
}

export const serialize = contract => JSON.stringify(contract, null, 2) + '\n';
export function readSnapshot(root = ROOT) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, SNAPSHOT_FILE), 'utf8'));
  } catch {
    return null;
  }
}
export function writeSnapshot(contract, root = ROOT) {
  fs.writeFileSync(path.join(root, SNAPSHOT_FILE), serialize(contract));
}

// Top-level sections that differ, then the entries added or removed inside lists.
function changes(a, b, at = '') {
  if (Array.isArray(a) && Array.isArray(b) && [...a, ...b].every(v => typeof v === 'string')) {
    return [
      ...b.filter(v => !a.includes(v)).map(v => `${at}: added ${v}`),
      ...a.filter(v => !b.includes(v)).map(v => `${at}: removed ${v}`),
    ]; // order alone is not a change
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a))
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(key =>
      changes(a[key], b[key], at ? `${at}.${key}` : key),
    );
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [`${at}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`];
}

// Changes are classified against both sides so removing or demoting a stable export remains stable.
export function contractChanges(current, previous) {
  const { platformVersion: _a, api: before = {}, types: oldTypes = {}, ...then } = previous;
  const { platformVersion: _b, api: after = {}, types: newTypes = {}, ...now } = current;
  const result = { stable: changes(then, now), experimental: [] };
  const classified = (a, b, prefix) => {
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const lines = changes(a[name], b[name], `${prefix}.${name}`);
      result[a[name]?.stability === 'stable' || b[name]?.stability === 'stable' ? 'stable' : 'experimental'].push(
        ...lines,
      );
    }
  };
  classified(oldTypes, newTypes, 'types');
  for (const entry of new Set([...Object.keys(before), ...Object.keys(after)]))
    classified(before[entry] ?? {}, after[entry] ?? {}, `api.${entry}`);
  return result;
}

export function contractProblems(current, snapshot, tags = []) {
  if (!snapshot || snapshot.snapshotVersion !== SNAPSHOT_VERSION)
    return [...tags, `${SNAPSHOT_FILE} is missing or uses an unsupported schema. Run pnpm contract --update.`];
  const changed = contractChanges(current, snapshot);
  const lines = [...changed.stable, ...changed.experimental];
  if (current.platformVersion !== snapshot.platformVersion || lines.length)
    return [
      ...tags,
      `The contract snapshot is stale:\n${lines.map(line => `  ${line}`).join('\n')}\nRun pnpm contract --update. Released-baseline verification independently enforces the version policy.`,
    ];
  return tags;
}
