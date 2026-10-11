// The file types installed in src/modules/ (the modules that have a type.ts and are on), for the build
// and the dev server. Delete a folder, or turn the module off in studio.config.ts, and its type is gone from here
// too: its files become plain files. The app finds the same folders with a glob (src/platform/app/data/fileTypes.ts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertUniqueExtensions, systemContentType, matchFileType } from '../../core/fileTypes.ts';
import { ENABLED_MODULES } from './modules.js';

import { INSTALLED_FILE_TYPES } from './installed-file-types.js';
export { INSTALLED_FILE_TYPES } from './installed-file-types.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../modules');

const ids = ENABLED_MODULES.map(m => m.id)
  .filter(id => fs.existsSync(path.join(DIR, id, 'type.ts')))
  .sort();

export const FILE_TYPES = Object.fromEntries(ids.map(id => [id, INSTALLED_FILE_TYPES[id]]));
assertUniqueExtensions(FILE_TYPES);

// The id of the type that owns a file, by its extension, or null for a plain file.
export const fileTypeOf = file => matchFileType(FILE_TYPES, file);
// Whether a file can open as text: under the size limit every committed file has
// (check-asset-size.js) and with no NUL bytes in its start, which binary files have.
const MAX_TEXT_BYTES = 750 * 1024;
export function isTextFile(file) {
  if (fs.statSync(file).size > MAX_TEXT_BYTES) return false;
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(8000);
    return !head.subarray(0, fs.readSync(fd, head, 0, head.length, 0)).includes(0);
  } finally {
    fs.closeSync(fd);
  }
}

// The id of the type that opens a file in the system content (src/platform/): a document, or else plain text.
export const systemContentTypeOf = file => systemContentType(FILE_TYPES, file);
