import fs from 'node:fs';
import path from 'node:path';
import { readContributors } from './contributors.js';
import { canonicalDirectory } from './safe-paths.js';
import { readDeclaration } from '../../core/declarations.ts';
import { resourceDirectory } from '../../core/resourceReferences.ts';
import { jsonIdentity } from '../../core/resourceIdentity.ts';
import { resourceId } from '../../core/resourceIdentity.ts';

// Refresh from ordinary source files rather than cached module imports. CI builds
// the same directory from its before-side declarations without reading this path.
export function readResourceDirectory(root) {
  const { contributors, problems } = readContributors(root);
  if (problems.length) throw new Error(problems.join('\n'));
  // JSON.parse alone accepts duplicate keys. Identity declarations must have a
  // single unambiguous studioId, including escaped spellings of that key.
  for (const key of Object.keys(contributors))
    jsonIdentity(fs.readFileSync(path.join(root, 'contributors', `${key}.json`), 'utf8'));
  const folder = path.join(root, 'src/systems');
  const systems = Object.create(null);
  if (fs.existsSync(folder)) {
    if (!canonicalDirectory(folder, root)) throw new Error('System identities require an ordinary source directory.');
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isSymbolicLink()) throw new Error(`System identity ${entry.name} cannot use a symbolic directory.`);
      if (!entry.isDirectory()) continue;
      const file = path.join(folder, entry.name, 'system.ts');
      if (
        !canonicalDirectory(path.dirname(file), root) ||
        !fs.existsSync(file) ||
        fs.lstatSync(file).isSymbolicLink() ||
        !fs.lstatSync(file).isFile()
      )
        throw new Error(`${file}: system identity requires an ordinary declaration.`);
      const declaration = readDeclaration(fs.readFileSync(file, 'utf8'));
      if ('error' in declaration) throw new Error(`${file}: ${declaration.error}`);
      systems[entry.name] = declaration.value;
    }
  }
  return resourceDirectory(contributors, systems);
}

export function prototypeSourceForIdentity(root, identity) {
  const id = resourceId(identity),
    matches = [];
  const prototypes = path.join(root, 'src/prototypes');
  if (!fs.existsSync(prototypes)) throw new Error(`Prototype identity ${id} is unavailable.`);
  if (!canonicalDirectory(prototypes, root))
    throw new Error('Prototype references require ordinary source directories.');
  for (const owner of fs.readdirSync(prototypes, { withFileTypes: true })) {
    if (owner.name.startsWith('.')) continue;
    const ownerDir = path.join(prototypes, owner.name);
    if (owner.isSymbolicLink())
      throw new Error('Prototype identity lookup cannot follow symbolic contributor folders.');
    if (!owner.isDirectory()) continue;
    for (const entry of fs.readdirSync(ownerDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isSymbolicLink())
        throw new Error('Prototype identity lookup cannot follow symbolic prototype folders.');
      if (!entry.isDirectory()) continue;
      const file = path.join(ownerDir, entry.name, 'meta.json');
      if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile())
        throw new Error(`${file}: prototype metadata must be an ordinary file.`);
      if (jsonIdentity(fs.readFileSync(file, 'utf8')) === id)
        matches.push(`src/prototypes/${owner.name}/${entry.name}`);
    }
  }
  if (matches.length !== 1)
    throw new Error(`Prototype identity ${id} must resolve to exactly one retained source folder.`);
  return matches[0];
}
