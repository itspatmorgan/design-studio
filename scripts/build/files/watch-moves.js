import fs from 'node:fs';
import { fileMoves, repairReferences, snapshotFiles } from '../../lib/artifact-moves.js';

// The caller supplies only current owned/maintained prototypes. No content is cached or guessed.
export function watchMoves(server, scopes, onMove = () => {}) {
  let previous = new Map(),
    timer;
  const capture = () => {
    clearTimeout(timer);
    const next = new Map();
    for (const scope of scopes()) {
      try {
        const stat = fs.lstatSync(scope.dir);
        next.set(`${stat.dev}:${stat.ino}`, { ...scope, files: snapshotFiles(scope.dir) });
      } catch {
        /* A folder may be disappearing. */
      }
    }
    previous = next;
  };
  const flush = () => {
    clearTimeout(timer);
    const next = new Map();
    for (const scope of scopes()) {
      try {
        const stat = fs.lstatSync(scope.dir),
          identity = `${stat.dev}:${stat.ino}`;
        const files = snapshotFiles(scope.dir),
          old = previous.get(identity);
        if (old) {
          const moves = fileMoves(old.files, files);
          const address = old.address === scope.address ? scope.address : [old.address, scope.address];
          if (moves.size || Array.isArray(address)) {
            const result = repairReferences(scope.dir, old.files, files, address, moves);
            onMove(scope.dir, { movedPaths: [...moves], relinkedFiles: result.changes.map(change => change.file) });
            const routes = [...moves].map(([from, to]) => ({
              from:
                old.address +
                '/' +
                from
                  .replace(/\.[^./]+$/, '')
                  .split('/')
                  .map(encodeURIComponent)
                  .join('/'),
              to:
                scope.address +
                '/' +
                to
                  .replace(/\.[^./]+$/, '')
                  .split('/')
                  .map(encodeURIComponent)
                  .join('/'),
            }));
            if (Array.isArray(address)) routes.push({ from: old.address, to: scope.address });
            server.ws.send({ type: 'custom', event: 'studio:moves', data: routes });
            if (result.changes.length)
              server.config.logger.info(
                `[studio-files] Updated references in ${result.changes.length} file${result.changes.length === 1 ? '' : 's'}.`,
              );
          }
        }
        next.set(identity, { ...scope, files });
      } catch (error) {
        server.config.logger.warn(`[studio-files] References could not be updated: ${error.message}`);
      }
    }
    previous = next;
  };
  const changed = (event, file) => {
    if (!['add', 'unlink', 'addDir', 'unlinkDir'].includes(event) || !file.includes('/src/')) return;
    clearTimeout(timer);
    timer = setTimeout(flush, 40);
  };
  capture();
  server.watcher.on('all', changed);
  server.httpServer?.once('close', () => {
    clearTimeout(timer);
    server.watcher.off('all', changed);
  });
  return { flush, capture };
}
