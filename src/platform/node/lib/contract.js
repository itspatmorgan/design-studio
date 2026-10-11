// The platform's public contract as plain JSON, read from source, so a change to it can't skip a PLATFORM_VERSION bump.
// Covers every export of the public API (src/platform/api/, imported as #studio/<entry>) with its stability, the
// fields of the stable declaration types, the runtime package lists, and the stored format versions (src/platform/core/formats.ts).
// A stable export, a declaration type's fields, a runtime package list or a format version changes only with a PLATFORM_VERSION bump.
// An experimental export may change in any 0.x release, but the snapshot still records it, so the change is visible.
// Snapshot: src/platform/core/contract.snapshot.json, refreshed with `pnpm contract --update` (src/platform/node/check/check-contract.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { PLATFORM_VERSION } from '../../core/modules/index.ts';
import { FORMAT_VERSIONS } from '../../core/formats.ts';
import { API_ENTRIES, API_FOLDER, apiSpecifier } from '../../core/modules/boundaries.ts';
import { SHARED_RUNTIME_PACKAGES, SYSTEM_RUNTIME_PACKAGES } from './system-dependencies.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const SNAPSHOT_FILE = 'src/platform/core/contract.snapshot.json';
export const STABILITY = ['stable', 'experimental'];

// The stable declaration types whose fields the snapshot records, by the file that defines each.
const DECLARATION_TYPES = {
  ModuleSpec: 'src/platform/core/modules/index.ts',
  ModuleApp: 'src/platform/app/modules.ts',
  PaletteContext: 'src/platform/app/modules.ts',
  PrototypeAction: 'src/platform/app/modules.ts',
  SystemSpec: 'src/platform/modules/systems/spec.ts',
  SystemLibrary: 'src/platform/modules/systems/spec.ts',
  SystemIntro: 'src/platform/app/data/types.ts',
  SystemOverviewSummary: 'src/platform/app/data/types.ts',
  SystemCuration: 'src/platform/app/data/types.ts',
  FileTypeSpec: 'src/platform/core/fileTypes.ts',
  ArtifactCapabilities: 'src/platform/core/fileTypes.ts',
  IdentityMetadata: 'src/platform/core/resourceIdentity.ts',
};

const parse = (root, file) =>
  ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
const sorted = list => [...list].sort();

// Field names of a type alias with an object literal type, `?` marking optional ones.
export function typeFields(source, name) {
  const alias = source.statements.find(node => ts.isTypeAliasDeclaration(node) && node.name.text === name);
  if (!alias || !ts.isTypeLiteralNode(alias.type))
    throw new Error(`Cannot find the object type ${name} in ${source.fileName}.`);
  return alias.type.members
    .filter(m => ts.isPropertySignature(m) || ts.isMethodSignature(m))
    .map(member => member.name.getText(source) + (member.questionToken ? '?' : ''))
    .sort();
}

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

export function computeContract(root = ROOT) {
  return {
    platformVersion: PLATFORM_VERSION,
    formatVersions: { ...FORMAT_VERSIONS },
    api: Object.fromEntries(
      API_ENTRIES.filter(entry => fs.existsSync(path.join(root, API_FOLDER, `${entry}.ts`))).map(entry => [
        apiSpecifier(entry),
        apiExports(parse(root, `${API_FOLDER}/${entry}.ts`)).names,
      ]),
    ),
    types: Object.fromEntries(
      Object.entries(DECLARATION_TYPES).map(([name, file]) => [name, typeFields(parse(root, file), name)]),
    ),
    runtimePackages: { shared: [...SHARED_RUNTIME_PACKAGES], system: [...SYSTEM_RUNTIME_PACKAGES] },
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

// The changes an experimental export may make in any 0.x release: added, removed or changed while it is (and
// stays, or becomes) experimental. Anything that is or was stable needs a new version.
function apiChanges(then = {}, now = {}) {
  const lines = { stable: [], experimental: [] };
  for (const entry of new Set([...Object.keys(then), ...Object.keys(now)])) {
    const [a = {}, b = {}] = [then[entry], now[entry]];
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[name] === b[name]) continue;
      const line = `api.${entry}.${name}: ${a[name] ?? 'absent'} -> ${b[name] ?? 'absent'}`;
      lines[a[name] === 'stable' || b[name] === 'stable' ? 'stable' : 'experimental'].push(line);
    }
  }
  return lines;
}

// What is wrong with the contract compared with its snapshot, as sentences that say what to do. `tags` are the
// problems apiProblems found in the API folder, reported first.
export function contractProblems(current, snapshot, tags = []) {
  if (!snapshot) return [...tags, `${SNAPSHOT_FILE} is missing or unreadable. Run pnpm contract --update.`];
  const { platformVersion: nowVersion, api: nowApi, ...now } = current;
  const { platformVersion: thenVersion, api: thenApi, ...then } = snapshot;
  const api = apiChanges(thenApi, nowApi);
  const stable = [...changes(then, now), ...api.stable];
  const all = [...stable, ...api.experimental];
  const list = lines => lines.map(line => `  ${line}`).join('\n');
  if (nowVersion !== thenVersion)
    return [
      ...tags,
      `PLATFORM_VERSION is ${nowVersion} but ${SNAPSHOT_FILE} records ${thenVersion}, so the snapshot is stale${all.length ? `:\n${list(all)}\n` : '. '}Run pnpm contract --update.`,
    ];
  if (stable.length)
    return [
      ...tags,
      `The platform contract changed without a PLATFORM_VERSION change (still ${nowVersion}):\n${list(all)}\nBump PLATFORM_VERSION in src/platform/core/modules/index.ts, then run pnpm contract --update.`,
    ];
  if (api.experimental.length)
    return [
      ...tags,
      `Experimental API exports changed:\n${list(api.experimental)}\nThey may change without a PLATFORM_VERSION bump; run pnpm contract --update to record them.`,
    ];
  return tags;
}
