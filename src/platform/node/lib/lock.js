// studio.lock.json: what the studio has installed from elsewhere. `platform` is the upstream release the studio is on,
// { version, commit }, written by `pnpm studio update` and the installer; a studio without it is on an unknown release,
// and an update falls back to Git's merge base. `modules` and `systems` list what was added from a source
// (pnpm studio add), so a change to it can be told from the original and a removal knows what to delete. Modules and
// systems that came with the kit aren't listed. The file is team-owned (src/platform/context/ownership.md).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const LOCK_NAME = 'studio.lock.json';
export const LOCK_FILE = path.join(ROOT, LOCK_NAME);

export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
export const hashFile = file => sha256(fs.readFileSync(file));

const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const COMMIT = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
// A platform entry the tools can trust, or null for an unknown release.
const platformEntry = value =>
  value && typeof value === 'object' && VERSION.test(value.version) && COMMIT.test(value.commit)
    ? { version: value.version, commit: value.commit }
    : null;

export function readLock(root = ROOT) {
  const file = path.join(root, LOCK_NAME);
  const lock = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  return {
    lockfileVersion: 1,
    platform: platformEntry(lock.platform),
    modules: lock.modules ?? {},
    systems: lock.systems ?? {},
  };
}

// Sorted and in a fixed key order, so the file only changes when something in it does. A lock with nothing in it is
// deleted; one with a platform entry always exists.
export function writeLock(lock, root = ROOT) {
  const file = path.join(root, LOCK_NAME);
  const sorted = o =>
    Object.fromEntries(
      Object.keys(o ?? {})
        .sort()
        .map(k => [k, o[k]]),
    );
  const platform = platformEntry(lock.platform);
  if (lock.platform && !platform)
    throw new Error('The platform entry needs a version like 0.2.0 and a full commit id.');
  const clean = {
    lockfileVersion: 1,
    ...(platform ? { platform } : {}),
    modules: sorted(lock.modules),
    systems: sorted(lock.systems),
  };
  if (!platform && !Object.keys(clean.modules).length && !Object.keys(clean.systems).length) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.writeFileSync(file, JSON.stringify(clean, null, 2) + '\n');
}

// Records the upstream release the studio is now on, keeping everything else in the lock.
export const recordPlatform = (root, { version, commit }) =>
  writeLock({ ...readLock(root), platform: { version, commit } }, root);

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
