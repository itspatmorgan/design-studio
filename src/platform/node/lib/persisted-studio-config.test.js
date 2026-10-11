import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readPersistedStudioConfig } from './persisted-studio-config.js';

test('fresh persisted configuration reads survive source renames without changing grants or their declarations', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-persisted-config-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'contributors'));
  fs.mkdirSync(path.join(root, 'src/systems/product'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'contributors/pat.json'),
    JSON.stringify({ formatVersion: 1, name: 'Pat', email: '', github: '', studioId: '0123456789abcdef' }),
  );
  fs.writeFileSync(
    path.join(root, 'src/systems/product/system.ts'),
    "export default { studioId: 'abcdefghjkmnpqrs' };",
  );
  const source =
    '{ "defaultSystem": "abcdefghjkmnpqrs", "admins": ["0123456789abcdef"], "systems": ["product"], "systemMaintainers": { "abcdefghjkmnpqrs": ["0123456789abcdef"] } }\n';
  fs.writeFileSync(path.join(root, 'studio.config.json'), source);
  const before = readPersistedStudioConfig(root);
  assert.equal(before.source, source);
  assert.equal(before.persisted.defaultSystem, 'abcdefghjkmnpqrs');
  assert.equal(before.config.defaultSystem, 'product');
  assert.deepEqual(before.config.admins, ['pat']);
  fs.renameSync(path.join(root, 'contributors/pat.json'), path.join(root, 'contributors/morgan.json'));
  fs.renameSync(path.join(root, 'src/systems/product'), path.join(root, 'src/systems/team-kit'));
  const after = readPersistedStudioConfig(root);
  assert.equal(after.config.defaultSystem, 'team-kit');
  assert.deepEqual(after.config.admins, ['morgan']);
  assert.deepEqual(after.config.systemMaintainers, { 'team-kit': ['morgan'] });
  assert.equal(after.source, source);
  assert.deepEqual(before.config.systemMaintainers, { product: ['pat'] });
  fs.writeFileSync(
    path.join(root, 'studio.config.json'),
    source.replace('"defaultSystem": "abcdefghjkmnpqrs"', '"defaultSystem": "team-kit"'),
  );
  assert.throws(() => readPersistedStudioConfig(root), /exactly 16/);
});

test('ambiguous JSON contributor identities fail before resolving any grants', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-ambiguous-person-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'contributors'));
  fs.writeFileSync(path.join(root, 'studio.config.json'), '{}');
  fs.writeFileSync(
    path.join(root, 'contributors/pat.json'),
    '{"name":"Pat","email":"","github":"","studioId":"0123456789abcdef","studioId":"abcdefghjkmnpqrs"}',
  );
  assert.throws(() => readPersistedStudioConfig(root), /only once/);
});

test('a configuration that is not plain JSON is refused with the file name', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-bad-config-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'contributors'));
  const write = text => fs.writeFileSync(path.join(root, 'studio.config.json'), text);
  write('// a comment\n{}');
  assert.throws(() => readPersistedStudioConfig(root), /studio\.config\.json is not valid JSON/);
  write('export default {};');
  assert.throws(() => readPersistedStudioConfig(root), /studio\.config\.json is not valid JSON/);
  write('[]');
  assert.throws(() => readPersistedStudioConfig(root), /must be a JSON object/);
  write('{"name":"A","name":"B"}');
  assert.throws(() => readPersistedStudioConfig(root), /"name" more than once/);
  fs.rmSync(path.join(root, 'studio.config.json'));
  fs.writeFileSync(path.join(root, 'real.json'), '{}');
  fs.symlinkSync(path.join(root, 'real.json'), path.join(root, 'studio.config.json'));
  assert.throws(() => readPersistedStudioConfig(root), /must be an ordinary file/);
});
