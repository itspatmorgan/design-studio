import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// A move already publishes its new routes and loader inventory. Its own rewritten
// files must not also propagate a stale HMR graph into a full document reload.
// Match the exact completed content so a subsequent code edit still gets normal HMR.
export function moveUpdates() {
  const pending = new Map();
  const digest = file => {
    try {
      return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    } catch {
      return null;
    }
  };
  return {
    record(dir, result) {
      const files = new Set((result.relinkedFiles ?? []).map(file => path.resolve(dir, file)));
      for (const [from, to] of result.movedPaths ?? []) {
        files.add(path.resolve(dir, from));
        files.add(path.resolve(dir, to));
      }
      const moved = new Set((result.movedPaths ?? []).flat().map(file => path.resolve(dir, file)));
      for (const file of files)
        pending.set(file, { digest: digest(file), moved: moved.has(file), expires: Date.now() + 5000 });
    },
    moved(file) {
      return pending.get(file)?.moved === true;
    },
    includes(file) {
      const now = Date.now();
      for (const [key, value] of pending) if (value.expires < now) pending.delete(key);
      const expected = pending.get(file);
      if (!expected) return false;
      if (digest(file) === expected.digest) return true;
      pending.delete(file);
      return false;
    },
  };
}
