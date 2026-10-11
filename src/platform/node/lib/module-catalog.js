// Installed declarations are independent of runtime configuration. CI must be
// able to inspect proposals without loading their proposed grants or profiles.
// Modules are found in the two module roots, supplied first (src/platform/core/roots.ts).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CORE_PAGE_KEYS, moduleProblems, moduleRootProblems, sectionKeys } from '../../core/modules/index.ts';
import { setModuleFolders } from '../../core/roots.ts';
import { discoverModuleFolders } from './module-folders.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

// Every folder with a module.ts, supplied root first, as { id, dir, spec }. An id found in both roots appears twice;
// declarationProblems says so, and the supplied one is the one MODULES keeps.
export const DECLARATIONS = await Promise.all(
  discoverModuleFolders(ROOT).map(async ({ id, dir }) => ({
    id,
    dir,
    spec: (await import(pathToFileURL(path.join(ROOT, dir, 'module.ts')).href)).default,
  })),
);

// Where each module's folder is, so a module's files (src/platform/core/roots.ts) are looked up in the right root.
// This registers when the file loads, which is before anything asks for a module's files.
setModuleFolders(DECLARATIONS.map(({ id, dir }) => [id, dir]));
const ids = [...new Set(DECLARATIONS.map(({ id }) => id))].sort();

// Every module, by id. Problems with a declaration are reported by src/platform/node/check/check-modules.js.
export const MODULES = Object.fromEntries(
  ids.map(id => [id, DECLARATIONS.find(declaration => declaration.id === id).spec]),
);

// The folder of each module under the repository root ("src/platform/modules/canvas/"), by id.
export const MODULE_DIRS = Object.fromEntries(
  ids.map(id => [id, DECLARATIONS.find(declaration => declaration.id === id).dir]),
);

export const declarationProblems = () => [
  ...moduleRootProblems(DECLARATIONS),
  ...DECLARATIONS.flatMap(({ id, dir, spec }) => moduleProblems(spec, id, dir)),
];

export const SECTION_KEYS = new Set([...CORE_PAGE_KEYS, ...sectionKeys(Object.values(MODULES).filter(Boolean))]);
