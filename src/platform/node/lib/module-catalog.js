// Installed declarations are independent of runtime configuration. CI must be
// able to inspect proposals without loading their proposed grants or profiles.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CORE_PAGE_KEYS, moduleProblems, sectionKeys } from '../../core/modules/index.ts';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../modules');
const ids = fs
  .readdirSync(DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && fs.existsSync(path.join(DIR, d.name, 'module.ts')))
  .map(d => d.name)
  .sort();

// Every module, by id. Problems with a declaration are reported by src/platform/node/check/check-modules.js.
export const MODULES = Object.fromEntries(
  await Promise.all(
    ids.map(async id => [id, (await import(pathToFileURL(path.join(DIR, id, 'module.ts')).href)).default]),
  ),
);

export const declarationProblems = () => ids.flatMap(id => moduleProblems(MODULES[id], id));

export const SECTION_KEYS = new Set([...CORE_PAGE_KEYS, ...sectionKeys(Object.values(MODULES).filter(Boolean))]);
