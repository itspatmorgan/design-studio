// Keeps the manifest live during `pnpm dev`, without reloading the page.
//
// Vite already watches every file. When something under src/prototypes/, a module's content folder, src/platform/, src/systems/, src/modules/documentation/pages/, or a module contract
// changes (from the app, an agent, or your editor), this rebuilds the manifest in-process
// and pushes it to the app over Vite's dev connection. The app swaps it in and refreshes
// only the routes that use it (see router.tsx), so the open view and scroll position stay.
// Bursts of changes, like moving a folder, are batched into one update.
import fs from 'node:fs';
import path from 'node:path';
import { knowledgeOwners, skillCatalog, syncSkillAdapters } from '../lib/agent-skills.js';
import { SYSTEM_SPECS } from '../../src/modules/systems/node/systems.js';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './build-manifest.js';
import { FILE_TYPES, fileTypeOf } from '../lib/file-types.js';
import { ENABLED_MODULES, PROTOTYPE_DIRS } from '../lib/modules.js';
import { CONTRIBUTORS_DIR } from '../lib/contributors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROTOS = path.join(ROOT, 'src', 'prototypes');
const SYSTEM_CONTENT = path.join(ROOT, 'src', 'platform');
// The Manual's pages, or null when its module is off or not installed.
const documentationModule = ENABLED_MODULES.find((m) => m.id === 'documentation');
const MANUAL = documentationModule?.section?.folder ? path.join(ROOT, documentationModule.section.folder) : null;
const SYSTEMS = path.join(ROOT, 'src', 'systems');
// The system content's map reads it (src/modules/systems/content/map.ts).
const AGENTS = path.join(ROOT, 'AGENTS.md');
const BATCH_MS = 50;

// The last manifest sent to the app. The files plugin publishes right after its own changes
// (with the tab that made them), so the watcher skips the same manifest a moment later.
let last = '';
export function publishManifest(server, manifest, origin) {
  last = JSON.stringify(manifest);
  server.ws.send({ type: 'custom', event: 'studio:manifest', data: { manifest, origin } });
}

const inside = (dir, file) => file === dir || file.startsWith(dir + path.sep);

// Adding or removing anything can change the list of views; editing a file only matters
// for meta.json, Manual frontmatter, contributor names, and a file that can be lofi (a view says so
// in its own text). Other edits to a view's code are left to Vite's hot reload.
function relevant(file, kind) {
  if (inside(CONTRIBUTORS_DIR, file) || file === AGENTS) return true;
  if (MANUAL && inside(MANUAL, file)) return file.endsWith('.md');
  if (inside(SYSTEM_CONTENT, file)) return kind !== 'change' || file.endsWith('.md');
  if (file.endsWith('.md') && /src[\\/](?:platform[\\/]core|modules)[\\/]/.test(file)) return true;
  // A system's component docs: files coming and going, and edits to the ones that describe a component
  // and to its theme (the tokens it lists).
  if (inside(SYSTEMS, file)) return kind !== 'change' || /\.(md|examples\.[jt]sx)$|styles[\\/]theme\.css$|(?:system\.ts|package\.json)$/.test(file);
  if (![PROTOS, ...PROTOTYPE_DIRS].some((dir) => inside(dir, file))) return false;
  return kind !== 'change' || path.basename(file) === 'meta.json' || hasFidelity(file);
}

const hasFidelity = (file) => { const id = fileTypeOf(file); return Boolean(id && FILE_TYPES[id].capabilities.fidelity); };

export default function manifestWatch() {
  return {
    name: 'prototype-manifest-watch',
    apply: 'serve',
    configureServer(server) {
      if (!fs.existsSync(path.join(ROOT, '.studio-system-operation'))) buildManifest();
      server.watcher.add([PROTOS, ...PROTOTYPE_DIRS, SYSTEM_CONTENT, ...(MANUAL ? [MANUAL] : []), SYSTEMS, CONTRIBUTORS_DIR, AGENTS]);
      let timer = null;
      // Every file that changed since the last build, even ones that don't ask for a rebuild: the next one tells the
      // build which prototypes to look at again, so an edit that waited for it is never missed.
      const touched = new Set();
      const flush = () => {
        timer = null;
        if (fs.existsSync(path.join(ROOT, '.studio-system-operation'))) { timer = setTimeout(flush, BATCH_MS); return; }
        const { manifest } = buildManifest({ touched: [...touched] });
        if ([...touched].some(file => /[\\/]skills(?:[\\/]|$)/.test(file))) {
          try {
            const result = syncSkillAdapters(ROOT, skillCatalog(ROOT, knowledgeOwners(ENABLED_MODULES, SYSTEM_SPECS)));
            for (const warning of result.warnings) server.config.logger.warn(warning);
          } catch (error) {
            server.config.logger.error(`Skill exposure was not updated: ${error.message}`);
          }
        }
        touched.clear();
        if (JSON.stringify(manifest) !== last) publishManifest(server, manifest);
      };
      const onEvent = (kind) => (file) => {
        touched.add(file);
        if (!relevant(file, kind)) return;
        clearTimeout(timer);
        timer = setTimeout(flush, BATCH_MS);
      };
      for (const kind of ['add', 'unlink', 'addDir', 'unlinkDir', 'change']) server.watcher.on(kind, onEvent(kind));
    },
  };
}
