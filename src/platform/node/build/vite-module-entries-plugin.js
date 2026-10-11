// Eager imports must be filtered before Vite expands them, not after module code executes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENABLED_MODULES, MODULES } from '../lib/modules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export function entryPaths(modules, entry, root = ROOT) {
  return modules
    .filter(m => fs.existsSync(path.join(root, 'src/modules', m.id, entry)))
    .map(m => `/modules/${m.id}/${entry}`);
}
export default function moduleEntries() {
  return {
    name: 'studio-module-entries',
    enforce: 'pre',
    transform(code, id) {
      const file = path.relative(ROOT, id.split('?')[0]).split(path.sep).join('/');
      if (
        ![
          'src/platform/app/modules.ts',
          'src/platform/app/data/fileTypes.ts',
          'src/platform/app/data/modules.ts',
        ].includes(file)
      )
        return null;
      if (file.endsWith('/data/modules.ts')) {
        const metadata = Object.fromEntries(Object.values(MODULES).map(m => [`/modules/${m.id}/module.ts`, m]));
        code = code.replace(/import\.meta\.glob<ModuleSpec>\([^\n]+\)/, JSON.stringify(metadata));
      }
      return {
        code: code.replace(/['"]\/__studio_modules__\/(app\.tsx|open\.tsx|type\.ts)['"]/g, (_, entry) =>
          JSON.stringify(entryPaths(ENABLED_MODULES, entry)),
        ),
        map: null,
      };
    },
  };
}
