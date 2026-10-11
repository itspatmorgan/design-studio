import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LOCK_NAME, readLock, recordPlatform, writeLock } from './lock.js';

const COMMIT = 'a'.repeat(40);
const studio = () => fs.mkdtempSync(path.join(os.tmpdir(), 'studio-lock-'));
const text = root => fs.readFileSync(path.join(root, LOCK_NAME), 'utf8');

test('a studio without a lock is on an unknown platform release', () => {
  assert.deepEqual(readLock(studio()), { lockfileVersion: 1, platform: null, modules: {}, systems: {} });
});

test('the platform entry is written first, before sorted modules and systems, and read back', () => {
  const root = studio();
  writeLock(
    {
      platform: { version: '0.2.1', commit: COMMIT },
      modules: { zeta: { source: 'z' }, alpha: { source: 'a' } },
      systems: {},
    },
    root,
  );
  assert.equal(
    text(root),
    `{\n  "lockfileVersion": 1,\n  "platform": {\n    "version": "0.2.1",\n    "commit": "${COMMIT}"\n  },\n  "modules": {\n    "alpha": {\n      "source": "a"\n    },\n    "zeta": {\n      "source": "z"\n    }\n  },\n  "systems": {}\n}\n`,
  );
  const before = text(root);
  writeLock(readLock(root), root);
  assert.equal(text(root), before, 'stable');
  assert.deepEqual(readLock(root).platform, { version: '0.2.1', commit: COMMIT });
});

test('a lock with only a platform entry is kept; one with nothing is deleted', () => {
  const root = studio();
  recordPlatform(root, { version: '0.2.0', commit: COMMIT });
  assert.ok(fs.existsSync(path.join(root, LOCK_NAME)));
  writeLock({ ...readLock(root), platform: null }, root);
  assert.equal(fs.existsSync(path.join(root, LOCK_NAME)), false);
});

test('recording the platform keeps what pnpm studio add recorded', () => {
  const root = studio();
  writeLock({ modules: { notes: { source: 'https://example.test/notes.git' } }, systems: {} }, root);
  recordPlatform(root, { version: '0.3.0', commit: COMMIT });
  const lock = readLock(root);
  assert.deepEqual(Object.keys(lock.modules), ['notes']);
  assert.equal(lock.platform.version, '0.3.0');
});

test('an invalid platform entry is unknown when read and refused when written', () => {
  const root = studio();
  fs.writeFileSync(path.join(root, LOCK_NAME), JSON.stringify({ platform: { version: 'latest', commit: 'abc' } }));
  assert.equal(readLock(root).platform, null);
  assert.throws(() => recordPlatform(root, { version: '0.2.0', commit: 'abc' }), /full commit id/);
});
