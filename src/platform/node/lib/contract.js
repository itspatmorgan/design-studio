// The platform's public contract as plain JSON, read from source, so a change to it can't skip a PLATFORM_VERSION bump.
// Covers module entrypoints, core/api.ts exports, the ModuleSpec/SystemSpec/SystemLibrary fields and the runtime package lists.
// Snapshot: src/platform/core/contract.snapshot.json, refreshed with `pnpm contract --update` (src/platform/node/check/check-contract.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { PLATFORM_VERSION } from '../../core/modules/index.ts';
import { MODULE_PLATFORM_ENTRIES } from '../../core/modules/boundaries.ts';
import { SHARED_RUNTIME_PACKAGES, SYSTEM_RUNTIME_PACKAGES } from './system-dependencies.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const SNAPSHOT_FILE = 'src/platform/core/contract.snapshot.json';

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

// Export names of a module, split into values and types; `export * from` is kept as written.
export function exportNames(source) {
  const values = new Set(),
    types = new Set();
  for (const node of source.statements) {
    if (ts.isExportDeclaration(node)) {
      if (!node.exportClause) values.add(`* from ${node.moduleSpecifier.text}`);
      else
        for (const element of node.exportClause.elements)
          (node.isTypeOnly || element.isTypeOnly ? types : values).add(element.name.text);
    } else if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const kind = ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) ? types : values;
      if (ts.isVariableStatement(node))
        node.declarationList.declarations.forEach(d => kind.add(d.name.getText(source)));
      else if (node.name) kind.add(node.name.text);
    }
  }
  return { values: sorted(values), types: sorted(types) };
}

export function computeContract(root = ROOT) {
  const spec = parse(root, 'src/platform/modules/systems/spec.ts');
  return {
    platformVersion: PLATFORM_VERSION,
    moduleEntries: [...MODULE_PLATFORM_ENTRIES],
    apiExports: exportNames(parse(root, 'src/platform/core/api.ts')),
    types: {
      ModuleSpec: typeFields(parse(root, 'src/platform/core/modules/index.ts'), 'ModuleSpec'),
      SystemSpec: typeFields(spec, 'SystemSpec'),
      SystemLibrary: typeFields(spec, 'SystemLibrary'),
    },
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

// What is wrong with the contract compared with its snapshot, as sentences that say what to do.
export function contractProblems(current, snapshot) {
  if (!snapshot) return [`${SNAPSHOT_FILE} is missing or unreadable. Run pnpm contract --update.`];
  const { platformVersion: nowVersion, ...now } = current;
  const { platformVersion: thenVersion, ...then } = snapshot;
  const diff = changes(then, now);
  if (!diff.length && nowVersion === thenVersion) return [];
  const list = diff.map(line => `  ${line}`).join('\n');
  if (nowVersion === thenVersion)
    return [
      `The platform contract changed without a PLATFORM_VERSION change (still ${nowVersion}):\n${list}\nBump PLATFORM_VERSION in src/platform/core/modules/index.ts, then run pnpm contract --update.`,
    ];
  return [
    `PLATFORM_VERSION is ${nowVersion} but ${SNAPSHOT_FILE} records ${thenVersion}, so the snapshot is stale${diff.length ? `:\n${list}\n` : '. '}Run pnpm contract --update.`,
  ];
}
