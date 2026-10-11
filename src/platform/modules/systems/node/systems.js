// Installed system declarations are refreshed when Vite restarts after lifecycle changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../../../node/lib/modules.js';
import { readPersistedStudioConfig } from '../../../node/lib/persisted-studio-config.js';
import { readDeclaration } from '../../../core/declarations.ts';
import { platformSourceOf, sourceOf } from '../sources.ts';
import { platformSystemId, systemProblems, systemRootProblems, themeClassProblems } from '../spec.ts';
import { setSystemFolders } from '../../../core/roots.ts';
import { discoverSystemFolders } from '../../../node/lib/system-folders.js';
import { systemDependencyProblems, systemPeerProblems } from '../../../node/lib/system-dependencies.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
export let SYSTEM_SPECS = {};
export let PLATFORM_ID;
export let PLATFORM_SOURCE;
export let PROTOTYPE_SYSTEMS = {};
export let DEFAULT_SYSTEM;
export let SYSTEM_SOURCES = {};
export let SYSTEM_IDS = [];
export function refreshSystems() {
  Object.assign(CONFIG, readPersistedStudioConfig(ROOT).config);
  const found = discoverSystemFolders(ROOT);
  const read = found.map(({ id, dir }) => {
    const declaration = readDeclaration(fs.readFileSync(path.join(ROOT, dir, 'system.ts'), 'utf8'));
    if ('error' in declaration) throw new Error(`${dir}system.ts: ${declaration.error}`);
    return { id, dir, spec: declaration.value };
  });
  const rootProblems = systemRootProblems(read.map(({ id, dir, spec }) => ({ id, dir, role: spec.role })));
  if (rootProblems.length) throw new Error(rootProblems.join('\n'));
  const ids = [...new Set(read.map(({ id }) => id))].sort();
  SYSTEM_SPECS = Object.fromEntries(
    [...read]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map(({ id, dir, spec }) => [id, { ...spec, dir }]),
  );
  setSystemFolders(read.map(({ id, dir }) => [id, dir]));
  PLATFORM_ID = platformSystemId(SYSTEM_SPECS);
  PLATFORM_SOURCE = platformSourceOf(PLATFORM_ID, SYSTEM_SPECS[PLATFORM_ID]);
  PROTOTYPE_SYSTEMS = Object.fromEntries(
    Object.entries(SYSTEM_SPECS).filter(([id, spec]) => CONFIG.systems.includes(id) && spec.role === 'prototype'),
  );
  DEFAULT_SYSTEM = CONFIG.defaultSystem;
  SYSTEM_SOURCES = Object.fromEntries(
    ids.filter(id => CONFIG.systems.includes(id)).map(id => [id, sourceOf(id, SYSTEM_SPECS[id])]),
  );
  SYSTEM_SOURCES[PLATFORM_ID] = PLATFORM_SOURCE;
  SYSTEM_IDS = ids.filter(id => SYSTEM_SPECS[id].role === 'prototype');
}
refreshSystems();
export const systemDeclarationProblems = () => [
  ...Object.entries(SYSTEM_SPECS).flatMap(([id, spec]) => systemProblems(spec, id, spec.dir)),
  ...systemRootProblems(Object.entries(SYSTEM_SPECS).map(([id, spec]) => ({ id, dir: spec.dir, role: spec.role }))),
  ...themeClassProblems(SYSTEM_SPECS),
  ...systemDependencyProblems(ROOT, SYSTEM_SPECS),
  ...systemPeerProblems(ROOT, SYSTEM_SPECS),
];
