// The prototype design systems installed in src/systems/: one folder each, found with a glob, so the app runs with
// any of them removed. (src/modules/systems/node/systems.js finds the same folders for the build.)
import { platformSystemId, type SystemSpec } from '@/modules/systems/spec';
import { platformSourceOf } from '../sources';
import { resourceId, systemAddress } from '@/platform/core/fileTypes';
import { CONFIG } from '@/platform/app/data/config';

const specs = import.meta.glob<SystemSpec>('/systems/*/system.ts', { eager: true, import: 'default' });
const idOf = (path: string) => path.split('/').at(-2)!;

export const SYSTEM_SPECS: Record<string, SystemSpec & { dir: string }> = Object.fromEntries(
  Object.entries(specs)
    .filter(([path]) => CONFIG.systems.includes(idOf(path)))
    .map(([path, spec]) => [idOf(path), { ...spec, dir: `src/systems/${idOf(path)}/` }])
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
