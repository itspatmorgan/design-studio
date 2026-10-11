// Where systems live on disk: the supplied root (src/platform/systems) and the team's (src/systems).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { discoverSystemFolders, newSystemDir, systemDirOf, systemFolderTaken, systemIdsIn } from './system-folders.js';
import { readResourceDirectory } from './resource-directory.js';
import { auditResourceIdentities } from './resource-identity-audit.js';
import { systemRootProblems } from '../../modules/systems/spec.ts';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-system-folders-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write('src/platform/systems/studio/system.ts', "export default { role: 'platform', studioId: 'abcdefghjkmnpqrs' };");
  write('src/systems/product/system.ts', "export default { role: 'prototype', studioId: '0123456789abcdef' };");
  write('src/systems/brand/system.ts', "export default { role: 'prototype', studioId: 'cdefghjkmnpqrstv' };");
  return { root, write };
}

test('systems are found in both roots, supplied first, by the folder they are in', t => {
  const { root } = fixture(t);
  assert.deepEqual(discoverSystemFolders(root), [
    { id: 'studio', dir: 'src/platform/systems/studio/' },
    { id: 'brand', dir: 'src/systems/brand/' },
    { id: 'product', dir: 'src/systems/product/' },
  ]);
  assert.deepEqual(systemIdsIn(root), ['brand', 'product', 'studio']);
  assert.equal(systemDirOf(root, 'studio'), 'src/platform/systems/studio');
  assert.equal(systemDirOf(root, 'product'), 'src/systems/product');
});

test('a system that is not installed is placed in the team root, where new systems are made', t => {
  const { root } = fixture(t);
  assert.equal(systemDirOf(root, 'kit'), 'src/systems/kit');
  assert.equal(newSystemDir('kit'), 'src/systems/kit');
  fs.rmSync(path.join(root, 'src/platform/systems'), { recursive: true });
  assert.deepEqual(
    discoverSystemFolders(root).map(found => found.id),
    ['brand', 'product'],
  );
  fs.rmSync(path.join(root, 'src/systems'), { recursive: true });
  assert.deepEqual(discoverSystemFolders(root), []);
});

test('an id is taken when a folder with that name is in either root', t => {
  const { root } = fixture(t);
  fs.mkdirSync(path.join(root, 'src/systems/empty'), { recursive: true });
  for (const id of ['studio', 'product', 'empty']) assert.equal(systemFolderTaken(root, id), true);
  assert.equal(systemFolderTaken(root, 'kit'), false);
});

test('an id in both roots is an error, wherever it is checked', t => {
  const { root, write } = fixture(t);
  write('src/systems/studio/system.ts', "export default { role: 'prototype' };");
  const found = discoverSystemFolders(root);
  assert.equal(found.filter(({ id }) => id === 'studio').length, 2);
  assert.match(
    systemRootProblems(
      found.map(item => ({ ...item, role: item.dir.startsWith('src/platform') ? 'platform' : 'prototype' })),
    ).join('\n'),
    /studio: found in src\/platform\/systems\/studio\/ and src\/systems\/studio\//,
  );
  fs.mkdirSync(path.join(root, 'contributors'));
  assert.throws(() => readResourceDirectory(root), /system studio is also in another system root/);
});

test('the identity directory and audit read systems from both roots', t => {
  const { root } = fixture(t);
  fs.mkdirSync(path.join(root, 'contributors'));
  const directory = readResourceDirectory(root);
  assert.deepEqual(Object.keys(directory.systemIds).sort(), ['brand', 'product', 'studio']);
  const audit = auditResourceIdentities(root, {});
  assert.deepEqual(
    audit.resources
      .filter(item => item.kind === 'system')
      .map(item => item.key)
      .sort(),
    ['brand', 'product', 'studio'],
  );
});
