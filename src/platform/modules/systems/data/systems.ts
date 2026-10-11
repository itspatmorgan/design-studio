// The design systems installed in the system roots: src/platform/systems/ (supplied, the platform system) and
// src/systems/ (the team's), one folder each, found with globs, so the app runs with any of them removed. The roots
// are listed once in src/platform/core/roots.ts; Vite needs the glob patterns literal, so both spell them out.
// (src/platform/modules/systems/node/systems.js finds the same folders for the build.)
import { platformSystemId, systemRootProblems, type SystemSpec } from '@/platform/modules/systems/spec';
import { platformSourceOf } from '../sources';
import { resourceId, systemAddress } from '@/platform/core/fileTypes';
import { CONFIG } from '@/platform/app/data/config';
import { setSystemFolders } from '@/platform/core/roots';

const specs = import.meta.glob<SystemSpec>(['/platform/systems/*/system.ts', '/systems/*/system.ts'], {
  eager: true,
  import: 'default',
});
const idOf = (path: string) => path.split('/').at(-2)!;
const dirOf = (path: string) => `src${path.slice(0, path.lastIndexOf('/') + 1)}`;

// Where each system's folder is, so a system's files (src/platform/core/roots.ts) are looked up in the right root.
// This registers when the module loads, which is before anything asks for a system's files.
const found = Object.entries(specs).map(([path, spec]) => ({ id: idOf(path), dir: dirOf(path), role: spec.role }));
const rootProblems = systemRootProblems(found);
if (rootProblems.length) throw new Error(rootProblems.join('\n'));
setSystemFolders(found.map(({ id, dir }) => [id, dir]));

export const SYSTEM_SPECS: Record<string, SystemSpec & { dir: string }> = Object.fromEntries(
  Object.entries(specs)
    // The platform system is always part of the studio; the team's systems are the ones `systems` lists.
    .filter(([path, spec]) => spec.role === 'platform' || CONFIG.systems.includes(idOf(path)))
    .map(([path, spec]) => [idOf(path), { ...spec, dir: dirOf(path) }])
    .sort(([a], [b]) => (a as string).localeCompare(b as string)),
);

export const PLATFORM_ID = platformSystemId(SYSTEM_SPECS);
export const PLATFORM_SOURCE = platformSourceOf(PLATFORM_ID, SYSTEM_SPECS[PLATFORM_ID]);

export const PROTOTYPE_SYSTEMS = Object.fromEntries(
  Object.entries(SYSTEM_SPECS).filter(([, spec]) => spec.role === 'prototype'),
);

// Creation selects this configured system and persists its ID in prototype metadata.
export const DEFAULT_SYSTEM: string = CONFIG.defaultSystem;

export const ACTIVE_PROTOTYPE_SYSTEMS = Object.fromEntries(
  Object.entries(PROTOTYPE_SYSTEMS).filter(([, spec]) => spec.status === 'active'),
);

// Source keys locate installed files; browser addresses carry only permanent IDs.
export function systemKeyFromIdentity(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const matches = Object.entries(SYSTEM_SPECS).filter(([, spec]) => spec.studioId === id);
  if (matches.length > 1) throw new Error(`System identity ${id} is declared more than once.`);
  return matches[0]?.[0];
}
export const systemPath = (key: string) => systemAddress(resourceId(SYSTEM_SPECS[key]?.studioId));
