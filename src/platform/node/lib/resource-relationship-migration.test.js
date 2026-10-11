import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planResourceRelationshipMigration } from './resource-relationship-migration.js';
import { applySetupChanges } from './studio-setup.js';
import { readResourceDirectory } from './resource-directory.js';
import { resolveStudioReferences } from '../../core/resourceReferences.ts';
import { readDeclaration } from '../../core/declarations.ts';

const personId = '0123456789abcdef',
  systemId = 'abcdefghjkmnpqrs',
  platformId = '23456789abcdefgh',
  originalId = '3456789abcdefghj',
  copyId = '456789abcdefghjk';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-reference-migration-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, content) => {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  };
  write('contributors/pat.json', JSON.stringify({ studioId: personId, name: 'Pat', email: '', github: '' }));
  write('src/systems/studio/system.ts', `export default { studioId: '${platformId}', role: 'platform' };`);
  write('src/systems/product/system.ts', `export default { studioId: '${systemId}', role: 'prototype' };`);
  write(
    'studio.config.ts',
    "// Keep this intent\nexport default { name: 'Studio', usage: 'team', modules: {}, systems: ['studio','product'], defaultSystem: 'product', admins: ['pat'], systemMaintainers: { product: ['pat'] } };\n",
  );
  write(
    'src/prototypes/pat/original/meta.json',
    JSON.stringify({ title: 'Original', studioId: originalId, system: null }),
  );
  write(
    'src/prototypes/pat/copy/meta.json',
    JSON.stringify({
      title: 'Copy',
      studioId: copyId,
      system: 'product',
      rebuild: { targetSystemId: 'product', source: 'src/prototypes/pat/original' },
    }),
  );
  return { root, write };
}

test('relationship preview keeps source locations and source content while serializing stable grants and assignments', t => {
  const { root } = fixture(t);
  const changes = planResourceRelationshipMigration(root, {});
  assert.equal(changes.length, 3);
  for (const change of changes) assert.equal(fs.readFileSync(change.file, 'utf8'), change.before);
  const proposed = readDeclaration(changes.find(change => change.file.endsWith('studio.config.ts')).after).value;
  assert.deepEqual(proposed.systems, ['studio', 'product']);
  assert.equal(proposed.defaultSystem, systemId);
  assert.deepEqual(proposed.admins, [personId]);
  assert.deepEqual(proposed.systemMaintainers, { [systemId]: [personId] });
  const copied = JSON.parse(changes.find(change => change.file.endsWith('copy/meta.json')).after);
  assert.equal(copied.ownerContributorId, personId);
  assert.equal(copied.systemId, systemId);
  assert.deepEqual(copied.rebuild, { targetSystemId: systemId, sourcePrototypeId: originalId });
  assert.equal(JSON.parse(changes.find(change => change.file.endsWith('original/meta.json')).after).systemId, null);
  applySetupChanges(changes);
  const resolved = resolveStudioReferences(proposed, readResourceDirectory(root));
  assert.equal(resolved.defaultSystem, 'product');
  assert.deepEqual(resolved.admins, ['pat']);
  assert.equal(planResourceRelationshipMigration(root, {}).length, 0);
});

test('unknown or deleted dependencies require reconciliation instead of inventing a reference identity', t => {
  const { root, write } = fixture(t);
  write(
    'src/prototypes/pat/copy/meta.json',
    JSON.stringify({
      title: 'Copy',
      studioId: copyId,
      system: 'removed',
      systemMissing: { id: 'removed', label: 'Removed' },
    }),
  );
  assert.throws(() => planResourceRelationshipMigration(root, {}));
  assert.match(fs.readFileSync(path.join(root, 'studio.config.ts'), 'utf8'), /admins: \['pat'\]/);
  write(
    'src/prototypes/pat/copy/meta.json',
    JSON.stringify({
      title: 'Copy',
      studioId: copyId,
      system: 'product',
      rebuild: { targetSystemId: null, source: 'src/prototypes/pat/missing' },
    }),
  );
  assert.throws(() => planResourceRelationshipMigration(root, {}), /rebuild source is unavailable/);
});

test('reviewed migration pins historical omission, retains identities, and rejects ambiguous relationship fields', t => {
  const { root, write } = fixture(t),
    file = 'src/prototypes/pat/original/meta.json';
  write(file, JSON.stringify({ title: 'Original', studioId: originalId, ownerId: personId }));
  const changes = planResourceRelationshipMigration(root, {});
  const next = JSON.parse(changes.find(change => change.file.endsWith(file)).after);
  assert.equal(next.studioId, originalId);
  assert.equal(next.ownerContributorId, personId);
  assert.equal(next.systemId, systemId);
  assert.equal(Object.hasOwn(next, 'system'), false);
  assert.equal(Object.hasOwn(next, 'ownerId'), false);
  for (const fields of [
    { system: null, systemId },
    { ownerId: personId, ownerContributorId: personId },
  ]) {
    write(file, JSON.stringify({ title: 'Original', studioId: originalId, ...fields }));
    assert.throws(() => planResourceRelationshipMigration(root, {}), /not both relationship fields/);
  }
});
