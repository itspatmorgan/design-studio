// studio.lock.json: what was added from a source (pnpm studio add), so a change to it can be told from the original
// and a removal knows what to delete. Modules and systems that came with the kit aren't listed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const LOCK_FILE = path.join(ROOT, 'studio.lock.json');

export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
export const hashFile = file => sha256(fs.readFileSync(file));

export function readLock() {
  if (!fs.existsSync(LOCK_FILE)) return { lockfileVersion: 1, modules: {}, systems: {} };
  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  return { lockfileVersion: 1, modules: lock.modules ?? {}, systems: lock.systems ?? {} };
}

// Sorted, so the file only changes when something in it does.
export function writeLock(lock) {
  const sorted = o =>
    Object.fromEntries(
      Object.keys(o)
        .sort()
        .map(k => [k, o[k]]),
    );
  const clean = { lockfileVersion: 1, modules: sorted(lock.modules), systems: sorted(lock.systems) };
  if (!Object.keys(clean.modules).length && !Object.keys(clean.systems).length) {
    fs.rmSync(LOCK_FILE, { force: true });
    return;
  }
  fs.writeFileSync(LOCK_FILE, JSON.stringify(clean, null, 2) + '\n');
}

// What differs from the original in everything the lock lists: [{ id, kind, changed: [], missing: [] }].
export function changesFromLock(lock = readLock()) {
  const out = [];
  for (const kind of ['modules', 'systems']) {
    for (const [id, entry] of Object.entries(lock[kind])) {
      const changed = [],
        missing = [];
      for (const [file, hash] of Object.entries(entry.files ?? {})) {
        const abs = path.join(ROOT, file);
        if (!fs.existsSync(abs)) missing.push(file);
        else if (hashFile(abs) !== hash) changed.push(file);
      }
      if (changed.length || missing.length)
        out.push({ id, kind: kind === 'modules' ? 'module' : 'design system', changed, missing });
    }
  }
  return out;
}
