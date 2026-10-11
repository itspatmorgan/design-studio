// The build.ts hooks of the enabled modules (src/platform/core/modules/index.ts, ModuleBuild), loaded synchronously so
// the manifest build and the dev server's watch list can use them.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ENABLED_MODULES, MODULE_DIRS } from './modules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(import.meta.url);

let loaded;
// [id, hook] for each enabled module with a build.ts, in module order.
export function moduleBuilds() {
  loaded ??= ENABLED_MODULES.flatMap(m => {
    const file = path.join(ROOT, MODULE_DIRS[m.id], 'build.ts');
    return fs.existsSync(file) ? [[m.id, require(file).default]] : [];
  });
  return loaded;
}

// Repo-relative files that the enabled modules' hooks expose for editing, from the manifest's contributions.
export function contributedSourceFiles(root, manifest) {
  return moduleBuilds().flatMap(([id, build]) => build.sourceFiles?.(manifest.contributions?.[id], { root }) ?? []);
}

// Absolute folders the enabled modules' hooks ask the dev server to watch.
export function contributedWatchDirs() {
  return moduleBuilds().flatMap(([, build]) => (build.watch ?? []).map(dir => path.join(ROOT, dir)));
}
