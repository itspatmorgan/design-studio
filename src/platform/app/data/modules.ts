// The modules installed in the module roots, src/platform/modules/ (supplied) and src/modules/ (the team's): one
// folder each, found with a glob, so the app runs with any of them removed. The roots are listed once in
// src/platform/core/roots.ts; Vite needs the glob patterns literal, so this spells both out.
// (src/platform/node/lib/modules.js finds the same folders for the build.)
import { moduleRootProblems, type ModuleSpec } from '@/platform/core/modules';
import { setModuleFolders, setSections } from '@/platform/core/roots';

const specs = import.meta.glob<ModuleSpec>(['/platform/modules/*/module.ts', '/modules/*/module.ts'], {
  eager: true,
  import: 'default',
});

// Where each module's folder is, so a module's files (src/platform/core/roots.ts) are looked up in the right root.
// This registers when the file loads, which is before anything asks for a module's files.
const found = Object.keys(specs).map(path => ({
  id: path.split('/').at(-2)!,
  dir: `src${path.slice(0, path.lastIndexOf('/') + 1)}`,
}));
const rootProblems = moduleRootProblems(found);
if (rootProblems.length) throw new Error(rootProblems.join('\n'));
setModuleFolders(found.map(({ id, dir }) => [id, dir]));

export const MODULES: ModuleSpec[] = Object.values(specs);
export const moduleById = (id: string) => MODULES.find(m => m.id === id);

// rootOf (src/platform/core/roots.ts) needs the sections of prototype-shaped folders; this runs before anything asks. (The systems' folders are registered by
// src/platform/modules/systems/data/systems.ts, which the app's file and manifest data import.)
setSections(MODULES.filter(m => m.section?.items === 'prototypes' && !m.section.byPerson).map(m => m.section!.key));
// Whether a section's items open on their own, filling the window, on the deployed site.
export const isStandalone = (key: string) => MODULES.some(m => m.section?.key === key && m.section.standalone);
