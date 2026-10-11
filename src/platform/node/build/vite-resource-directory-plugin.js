// A browser needs source selectors and permanent IDs, never full contributor
// profiles. Keep this generated module small and free of personal preferences.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readResourceDirectory } from '../lib/resource-directory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const RESOURCE_DIRECTORY_MODULE = 'virtual:studio-resource-directory';
const internal = '\0' + RESOURCE_DIRECTORY_MODULE;

export function directoryModuleSource(directory) {
  // Select fields explicitly rather than serializing an arbitrary caller object.
  const fields = ['contributorIds', 'contributorKeys', 'systemIds', 'systemKeys'];
  const selected = Object.fromEntries(fields.map(key => [key, directory[key]]));
  return `const directory = ${JSON.stringify(selected)};\nfor (const mapping of Object.values(directory)) Object.freeze(mapping);\nexport default Object.freeze(directory);\n`;
}

export default function resourceDirectoryPlugin(root = ROOT) {
  let lastSource;
  const relevant = file => {
    const relative = path.relative(root, file).split(path.sep).join('/');
    return /^contributors\/[^/]+\.json$/.test(relative) || /^src\/systems\/[^/]+\/system\.ts$/.test(relative);
  };
  return {
    name: 'studio-resource-directory',
    resolveId(source) {
      return source === RESOURCE_DIRECTORY_MODULE ? internal : null;
    },
    load(id) {
      if (id !== internal) return null;
      return (lastSource = directoryModuleSource(readResourceDirectory(root)));
    },
    configureServer(server) {
      server.watcher.add([path.join(root, 'contributors'), path.join(root, 'src/systems')]);
      const refresh = file => {
        if (!relevant(file) || fs.existsSync(path.join(root, '.studio-system-operation'))) return;
        const graph = server.environments.client.moduleGraph;
        const module = graph.getModuleById(internal);
        if (!module) return;
        let nextSource;
        try {
          nextSource = directoryModuleSource(readResourceDirectory(root));
        } catch {
          /* Invalidate so Vite's next load reports the declaration error. */
        }
        if (nextSource !== undefined && nextSource === lastSource) return;
        lastSource = nextSource;
        graph.invalidateModule(module);
        // System declarations already have a coordinated settings restart. Do
        // not reload the browser in the middle of its managed filesystem move.
        if (path.relative(root, file).startsWith('contributors' + path.sep)) server.ws.send({ type: 'full-reload' });
      };
      for (const event of ['add', 'unlink', 'change']) server.watcher.on(event, refresh);
      server.httpServer?.once('close', () => {
        for (const event of ['add', 'unlink', 'change']) server.watcher.off(event, refresh);
      });
    },
  };
}
