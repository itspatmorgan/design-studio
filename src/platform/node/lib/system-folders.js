// Where systems live on disk. Systems are found in two roots, the supplied one (src/platform/systems, upstream) first
// and the team's (src/systems) second, listed once in src/platform/core/roots.ts. A system's id is its folder name in
// whichever root holds it. These helpers take the repository root so they work in a fixture workspace as well as in
// this one, and have no dependencies beyond the filesystem, so the code that discovers systems and the code that
// edits them can both use them. Creating, renaming, and removing systems only ever use the team root.
import fs from 'node:fs';
import path from 'node:path';
import { SYSTEM_ROOTS, TEAM_SYSTEMS_ROOT } from '../../core/roots.ts';

// Every folder with a system.ts in the system roots, supplied root first, as { id, dir } where dir is the folder
// from the repository root ("src/systems/product/"). An id found in both roots appears twice.
export function discoverSystemFolders(root) {
  return SYSTEM_ROOTS.flatMap(systemsRoot => {
    const base = path.join(root, systemsRoot);
    if (!fs.existsSync(base)) return [];
    return fs
      .readdirSync(base, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && fs.existsSync(path.join(base, entry.name, 'system.ts')))
      .map(entry => ({ id: entry.name, dir: `${systemsRoot}/${entry.name}/` }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  });
}

// The folder of an installed system, from the repository root and without a trailing slash ("src/systems/product").
// A system that is not installed is taken to be in the team root, where new systems are made.
export function systemDirOf(root, id) {
  const found = SYSTEM_ROOTS.find(systemsRoot => fs.existsSync(path.join(root, systemsRoot, id, 'system.ts')));
  return `${found ?? TEAM_SYSTEMS_ROOT}/${id}`;
}

// The same, as an absolute path.
export const systemPath = (root, id) => path.join(root, systemDirOf(root, id));

// Where a new system is made: only the team root.
export const newSystemDir = id => `${TEAM_SYSTEMS_ROOT}/${id}`;

// Whether an id is already used by a folder in any system root (even one without a system.ts), so a new system
// can't take it.
export const systemFolderTaken = (root, id) =>
  SYSTEM_ROOTS.some(systemsRoot => fs.existsSync(path.join(root, systemsRoot, id)));

// Ids of the systems in the roots, sorted, without duplicates.
export const systemIdsIn = root => [...new Set(discoverSystemFolders(root).map(({ id }) => id))].sort();
