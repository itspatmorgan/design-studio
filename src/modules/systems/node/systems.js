// Installed system declarations are refreshed when Vite restarts after lifecycle changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../../../platform/node/lib/modules.js';
import { readPersistedStudioConfig } from '../../../platform/node/lib/persisted-studio-config.js';
import { readDeclaration } from '../../../platform/core/declarations.ts';
import { platformSourceOf, sourceOf } from '../sources.ts';
import { platformSystemId, systemProblems, themeClassProblems } from '../spec.ts';
import { systemDependencyProblems, systemPeerProblems } from '../../../platform/node/lib/system-dependencies.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const DIR = path.join(ROOT, 'src', 'systems');
export let SYSTEM_SPECS = {};
export let PLATFORM_ID;
export let PLATFORM_SOURCE;
export let PROTOTYPE_SYSTEMS = {};
export let DEFAULT_SYSTEM;
export let SYSTEM_SOURCES = {};
export let SYSTEM_IDS = [];
export function refreshSystems() {
  Object.assign(CONFIG, readPersistedStudioConfig(ROOT).config);
  const ids = fs
    .readdirSync(DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(DIR, entry.name, 'system.ts')))
    .map(entry => entry.name)
    .sort();
  SYSTEM_SPECS = Object.fromEntries(
    ids.map(id => {
      const declaration = readDeclaration(fs.readFileSync(path.join(DIR, id, 'system.ts'), 'utf8'));
      if ('error' in declaration) throw new Error(`src/systems/${id}/system.ts: ${declaration.error}`);
      return [id, { ...declaration.value, dir: `src/systems/${id}/` }];
    }),
  );
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
  ...Object.entries(SYSTEM_SPECS).flatMap(([id, spec]) => systemProblems(spec, id)),
  ...themeClassProblems(SYSTEM_SPECS),
  ...systemDependencyProblems(ROOT, SYSTEM_SPECS),
  ...systemPeerProblems(ROOT, SYSTEM_SPECS),
];
