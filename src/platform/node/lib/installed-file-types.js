// Retained file formats are available even when runtime modules are disabled.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineFileType } from '../../core/fileTypes.ts';
import { MODULES, MODULE_DIRS } from './module-catalog.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const INSTALLED_FILE_TYPES = Object.fromEntries(
  await Promise.all(
    Object.values(MODULES)
      .filter(module => module && fs.existsSync(path.join(ROOT, MODULE_DIRS[module.id], 'type.ts')))
      .map(async module => [
        module.id,
        defineFileType((await import(pathToFileURL(path.join(ROOT, MODULE_DIRS[module.id], 'type.ts')).href)).default),
      ]),
  ),
);
