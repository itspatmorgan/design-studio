// Provenance and file hashes for externally installed modules and systems.
// Supplied code is tracked by Git, not duplicated here.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const LOCK_NAME = 'studio.lock.json';
export const LOCK_FILE = path.join(ROOT, LOCK_NAME);

export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
export const hashFile = file => sha256(fs.readFileSync(file));

export function readLock(root = ROOT) {
  const file = path.join(root, LOCK_NAME);
  const lock = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  return {
    lockfileVersion: 1,
    modules: lock.modules ?? {},
    systems: lock.systems ?? {},
  };
}

// Write deterministically; remove an empty installation record.
export function writeLock(lock, root = ROOT) {
  const file = path.join(root, LOCK_NAME);
  const sorted = o =>
    Object.fromEntries(
      Object.keys(o ?? {})
        .sort()
        .map(k => [k, o[k]]),
    );
  const clean = {
    lockfileVersion: 1,
    modules: sorted(lock.modules),
    systems: sorted(lock.systems),
  };
  if (!Object.keys(clean.modules).length && !Object.keys(clean.systems).length) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.writeFileSync(file, JSON.stringify(clean, null, 2) + '\n');
}

// What differs from the original in everything the lock lists: [{ id, kind, changed: [], missing: [] }].
export function changesFromLock(lock = readLock(), root = ROOT) {
  const out = [];
  for (const kind of ['modules', 'systems']) {
    for (const [id, entry] of Object.entries(lock[kind])) {
      const changed = [],
        missing = [];
      for (const [file, hash] of Object.entries(entry.files ?? {})) {
        const abs = path.join(root, file);
        if (!fs.existsSync(abs)) missing.push(file);
        else if (hashFile(abs) !== hash) changed.push(file);
      }
      if (changed.length || missing.length)
        out.push({ id, kind: kind === 'modules' ? 'module' : 'design system', changed, missing });
    }
  }
  return out;
}
