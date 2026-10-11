import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeProfiles } from './fixtures/contributors.js';
import { writeFixtureConfig } from './fixtures/identities.js';
import { markdownIdentity } from '../../src/platform/core/resourceIdentity.ts';
import { planPrototypeIdentification, applyPrototypeIdentification } from './prototype-identification.js';

const types = { document: { inPrototype: true, extensions: ['.md'], identity: markdownIdentity } };
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-identify-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeProfiles(root, { admin: { name: 'Admin' }, pat: { name: 'Pat' }, sam: { name: 'Sam' } });
  writeFixtureConfig(root, {
    usage: 'team',
    admins: ['admin'],
    systems: ['studio', 'product'],
    defaultSystem: 'product',
    systemMaintainers: { product: [] },
    modules: {},
  });
  const folder = 'src/prototypes/pat/example';
  fs.mkdirSync(path.join(root, folder), { recursive: true });
  fs.writeFileSync(path.join(root, folder, 'meta.json'), '{"title":"Example","systemId":null}');
  fs.writeFileSync(path.join(root, folder, 'notes.md'), '# Notes\n');
  return { root, folder };
}

test('explicit authoring assigns only missing IDs, preserves dependencies, and is idempotent', t => {
  const { root, folder } = fixture(t);
  fs.mkdirSync(path.join(root, 'src/prototypes/sam/unrelated'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/prototypes/sam/unrelated/meta.json'), '{"title":"Other","systemId":null}');
  const plan = planPrototypeIdentification(root, types, folder, 'pat');
  assert.equal(fs.readFileSync(path.join(root, folder, 'notes.md'), 'utf8'), '# Notes\n');
  const result = applyPrototypeIdentification(root, types, plan, 'pat');
  assert.equal(result.changed, 2);
  const meta = JSON.parse(fs.readFileSync(path.join(root, folder, 'meta.json')));
  assert.equal(meta.ownerContributorId, JSON.parse(fs.readFileSync(path.join(root, 'contributors/pat.json'))).studioId);
  assert.equal(meta.systemId, null);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(root, 'src/prototypes/sam/unrelated/meta.json'))).studioId,
    undefined,
  );
  assert.equal(planPrototypeIdentification(root, types, folder, 'pat').changes.length, 0);
  assert.ok(fs.readFileSync(path.join(root, folder, 'notes.md'), 'utf8').endsWith('# Notes\n'));
});

test('scoped assignment rejects other owners, changed authority, edited previews, and malformed IDs', t => {
  const { root, folder } = fixture(t);
  assert.throws(() => planPrototypeIdentification(root, types, folder, 'sam'), /Only the prototype owner/);
  const plan = planPrototypeIdentification(root, types, folder, 'admin');
  assert.throws(() => applyPrototypeIdentification(root, types, plan, 'sam'), /Only the prototype owner/);
  assert.throws(
    () => applyPrototypeIdentification(root, types, { ...plan, changes: [] }, 'pat'),
    /preview or inventory changed/,
  );
  fs.writeFileSync(path.join(root, folder, 'notes.md'), '---\nstudioId: invalid\n---\n');
  assert.throws(() => planPrototypeIdentification(root, types, folder, 'pat'), /16 lowercase/);
});

test('inventory additions and owner spoofing invalidate a reviewed assignment before any write', t => {
  const { root, folder } = fixture(t);
  const plan = planPrototypeIdentification(root, types, folder, 'pat');
  fs.writeFileSync(path.join(root, folder, 'new.md'), '# New');
  assert.throws(() => applyPrototypeIdentification(root, types, plan, 'pat'), /preview or inventory changed/);
  const other = JSON.parse(fs.readFileSync(path.join(root, 'contributors/sam.json'))).studioId;
  fs.writeFileSync(
    path.join(root, folder, 'meta.json'),
    JSON.stringify({ title: 'Example', ownerContributorId: other }),
  );
  assert.throws(() => planPrototypeIdentification(root, types, folder, 'admin'), /owner identity/);
});

test('direct authoring never infers an omitted assignment from the configured default', t => {
  const { root, folder } = fixture(t),
    file = path.join(root, folder, 'meta.json');
  const before = '{"title":"Example"}';
  fs.writeFileSync(file, before);
  assert.throws(() => planPrototypeIdentification(root, types, folder, 'pat'), /declare systemId explicitly/);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(fs.readFileSync(path.join(root, folder, 'notes.md'), 'utf8'), '# Notes\n');
});
