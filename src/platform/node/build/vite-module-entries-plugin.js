// Eager imports must be filtered before Vite expands them, not after module code executes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENABLED_MODULES, MODULES, MODULE_DIRS } from '../lib/modules.js';
import { DECLARATIONS } from '../lib/module-catalog.js';
import { moduleRootProblems } from '../../core/modules/index.ts';
import { moduleDirOf } from '../lib/module-folders.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// The glob keys ("/platform/modules/canvas/app.tsx") of a module entry file in the modules that have it, wherever
// each module's folder is (src/platform/core/roots.ts).
export function entryPaths(modules, entry, root = ROOT) {
  return modules
    .map(m => moduleDirOf(root, m.id))
    .filter(dir => fs.existsSync(path.join(root, dir, entry)))
    .map(dir => `/${dir.replace(/^src\//, '')}/${entry}`);
}
export default function moduleEntries() {
  return {
    name: 'studio-module-entries',
    enforce: 'pre',
    // A module id is its folder name, so one found in both roots is ambiguous: stop instead of picking one.
    buildStart() {
      const problems = moduleRootProblems(DECLARATIONS);
      if (problems.length) this.error(problems.join('\n'));
    },
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
        const metadata = Object.fromEntries(
          Object.values(MODULES).map(m => [`/${MODULE_DIRS[m.id].replace(/^src\//, '')}module.ts`, m]),
        );
        code = code.replace(/import\.meta\.glob<ModuleSpec>\([^;]+\)(?=;)/, JSON.stringify(metadata));
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
