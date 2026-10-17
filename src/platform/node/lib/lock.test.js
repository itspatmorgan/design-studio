import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LOCK_NAME, readLock, writeLock, changesFromLock, hashFile } from './lock.js';

test('installed capability provenance survives round trips and detects changed and missing files', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-lock-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(readLock(root), { lockfileVersion: 1, modules: {}, systems: {} });
  fs.writeFileSync(path.join(root, 'component.ts'), 'original');
  const entry = {
    source: 'https://example.test/kit.git',
    files: { 'component.ts': hashFile(path.join(root, 'component.ts')) },
  };
  writeLock({ modules: { kit: entry }, systems: {} }, root);
  assert.deepEqual(readLock(root).modules.kit, entry);
  assert.deepEqual(changesFromLock(readLock(root), root), []);
  fs.writeFileSync(path.join(root, 'component.ts'), 'edited');
  assert.deepEqual(changesFromLock(readLock(root), root), [
    { id: 'kit', kind: 'module', changed: ['component.ts'], missing: [] },
  ]);
  fs.rmSync(path.join(root, 'component.ts'));
  assert.deepEqual(changesFromLock(readLock(root), root), [
    { id: 'kit', kind: 'module', changed: [], missing: ['component.ts'] },
  ]);
  writeLock({ modules: {}, systems: {} }, root);
  assert.equal(fs.existsSync(path.join(root, LOCK_NAME)), false);
});
