import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { viewIdentity, markdownIdentity, resourceId } from '../../core/resourceIdentity.ts';
import { planSourceIdentityMigration, applySourceIdentityMigration } from './resource-identity-migration.js';

const types = {
  view: { inPrototype: true, extensions: ['.tsx'], identity: viewIdentity },
  document: { inPrototype: true, extensions: ['.md'], identity: markdownIdentity },
};
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-identity-migration-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, text);
  };
  write('contributors/pat.json', '{"name":"Pat","welcomeDismissed":true}\n');
  write(
    'src/systems/product/system.ts',
    '// Product\nexport default { label: "Product", status: "active" } satisfies SystemSpec;\n',
  );
  write('src/prototypes/pat/example/meta.json', '{"title":"Example","system":null,"status":"archived"}');
  write('src/prototypes/pat/example/main.tsx', '/** @lofi */\nexport default () => null;\n');
  write('src/prototypes/pat/example/notes.md', '# Notes\n\n[View](./main.tsx)\n');
  return { root, write };
}

test('migration preview is read-only, applies reviewed IDs, preserves relationships and is idempotent', t => {
  const { root } = fixture(t);
  const plan = planSourceIdentityMigration(root, types);
  assert.equal(plan.changes.length, 5);
  for (const change of plan.changes) assert.equal(fs.readFileSync(path.join(root, change.path), 'utf8'), change.before);
  assert.equal(new Set(plan.resources.map(resource => resource.studioId)).size, 5);
  const migrated = applySourceIdentityMigration(root, types, JSON.parse(JSON.stringify(plan)));
  assert.equal(migrated.missing.length, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'src/prototypes/pat/example/meta.json'), 'utf8')), {
    title: 'Example',
    system: null,
    status: 'archived',
    studioId: migrated.resources.find(resource => resource.kind === 'prototype').studioId,
  });
  assert.match(
    fs.readFileSync(path.join(root, 'src/prototypes/pat/example/notes.md'), 'utf8'),
    /\[View\]\(\.\/main\.tsx\)/,
  );
  assert.match(fs.readFileSync(path.join(root, 'src/systems/product/system.ts'), 'utf8'), /^\/\/ Product/);
  assert.equal(planSourceIdentityMigration(root, types).changes.length, 0);
});

test('migration refuses stale edits, inventory additions, forged changes and outside paths before writing', t => {
  const { root, write } = fixture(t);
  const plan = planSourceIdentityMigration(root, types);
  const contributor = fs.readFileSync(path.join(root, 'contributors/pat.json'), 'utf8');
  const forged = structuredClone(plan);
  forged.changes[0].after = '{"name":"Imposter"}';
  assert.throws(() => applySourceIdentityMigration(root, types, forged), /plan changed/);
  const outside = structuredClone(plan);
  outside.resources[0].path = '../outside.json';
  assert.throws(() => applySourceIdentityMigration(root, types, outside), /outside the current inventory/);
  write('src/prototypes/pat/example/new.md', '# New');
  assert.throws(() => applySourceIdentityMigration(root, types, plan), /inventory.*changed/);
  fs.unlinkSync(path.join(root, 'src/prototypes/pat/example/new.md'));
  write('src/prototypes/pat/example/notes.md', '# Edited');
  assert.throws(() => applySourceIdentityMigration(root, types, plan), /inventory.*changed/);
  assert.equal(fs.readFileSync(path.join(root, 'contributors/pat.json'), 'utf8'), contributor);
});

test('migration retries generated collisions, refuses exhausted allocation and never replaces invalid identities', t => {
  const { root, write } = fixture(t);
  const first = resourceId('0123456789abcdef');
  write('contributors/pat.json', JSON.stringify({ name: 'Pat', studioId: first }));
  let attempts = 0;
  assert.throws(
    () =>
      planSourceIdentityMigration(root, types, {
        generate: () => {
          attempts++;
          return first;
        },
      }),
    /could not allocate/,
  );
  assert.equal(attempts, 32);
  const second = resourceId('abcdefghjkmnpqrs');
  const third = resourceId('23456789abcdefgh');
  const fourth = resourceId('3456789abcdefghj');
  const fifth = resourceId('456789abcdefghjk');
  const sequence = [first, second, second, third, fourth, fifth];
  const plan = planSourceIdentityMigration(root, types, { generate: () => sequence.shift() });
  assert.equal(plan.resources[0].studioId, first);
  assert.equal(new Set(plan.resources.map(resource => resource.studioId)).size, 5);
  write('src/prototypes/pat/example/main.tsx', '/** @studio-id bad */\nexport default null;');
  assert.throws(() => planSourceIdentityMigration(root, types), /exactly 16/);
});

test('a write failure rolls the metadata stage back without changing unrelated files', t => {
  const { root, write } = fixture(t);
  write('unrelated.txt', 'Keep me');
  const plan = planSourceIdentityMigration(root, types);
  const rename = fs.renameSync;
  let calls = 0;
  t.mock.method(fs, 'renameSync', (...args) => {
    if (++calls === 3) throw new Error('Injected write failure');
    return rename(...args);
  });
  assert.throws(() => applySourceIdentityMigration(root, types, plan), /Injected write failure/);
  for (const snapshot of plan.snapshot)
    assert.equal(fs.readFileSync(path.join(root, snapshot.path), 'utf8'), snapshot.before);
  assert.equal(fs.readFileSync(path.join(root, 'unrelated.txt'), 'utf8'), 'Keep me');
  assert.ok(!fs.readdirSync(path.join(root, 'contributors')).some(name => name.endsWith('.tmp')));
});

test('an edit during migration stops later writes and remains intact through rollback', t => {
  const { root } = fixture(t);
  const plan = planSourceIdentityMigration(root, types);
  const rename = fs.renameSync;
  let calls = 0;
  const editedFile = path.join(root, plan.changes[1].path);
  t.mock.method(fs, 'renameSync', (...args) => {
    const result = rename(...args);
    if (++calls === 1) fs.writeFileSync(editedFile, '// Concurrent editor change\n');
    return result;
  });
  assert.throws(() => applySourceIdentityMigration(root, types, plan), /changed/);
  assert.equal(fs.readFileSync(editedFile, 'utf8'), '// Concurrent editor change\n');
  assert.equal(fs.readFileSync(path.join(root, plan.changes[0].path), 'utf8'), plan.changes[0].before);
  for (const change of plan.changes.slice(2))
    assert.equal(fs.readFileSync(path.join(root, change.path), 'utf8'), change.before);
});

test('rollback refuses to overwrite a concurrent edit to an already migrated file', t => {
  const { root } = fixture(t);
  const plan = planSourceIdentityMigration(root, types);
  const rename = fs.renameSync;
  let calls = 0;
  const editedFile = path.join(root, plan.changes[0].path);
  t.mock.method(fs, 'renameSync', (...args) => {
    if (++calls === 3) {
      fs.writeFileSync(editedFile, '{"name":"Concurrent preference edit"}\n');
      throw new Error('Injected later failure');
    }
    return rename(...args);
  });
  assert.throws(() => applySourceIdentityMigration(root, types, plan), /some files could not be restored/);
  assert.equal(fs.readFileSync(editedFile, 'utf8'), '{"name":"Concurrent preference edit"}\n');
  assert.equal(fs.readFileSync(path.join(root, plan.changes[1].path), 'utf8'), plan.changes[1].before);
});
