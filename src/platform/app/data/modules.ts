// The modules installed in src/modules/: one folder each, found with a glob, so the app runs
// with any of them removed. (src/platform/node/lib/modules.js finds the same folders for the build.)
import type { ModuleSpec } from '@/platform/core/modules';
import { setSections } from '@/platform/core/roots';

const specs = import.meta.glob<ModuleSpec>('/modules/*/module.ts', { eager: true, import: 'default' });

export const MODULES: ModuleSpec[] = Object.values(specs);
export const moduleById = (id: string) => MODULES.find(m => m.id === id);

// rootOf (src/platform/core/roots.ts) needs the sections of prototype-shaped folders; this runs before anything asks. (The systems' folders are registered by
// src/modules/systems/data/systems.ts, which the app's file and manifest data import.)
setSections(MODULES.filter(m => m.section?.items === 'prototypes' && !m.section.byPerson).map(m => m.section!.key));
// Whether a section's items open on their own, filling the window, on the deployed site.
export const isStandalone = (key: string) => MODULES.some(m => m.section?.key === key && m.section.standalone);
