import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applySetupChanges } from './studio-setup.js';
import { planSettings, readSettings, saveSettings } from './studio-settings.js';
import { writeProfiles } from './fixtures/contributors.js';
import { writeFixtureConfig } from './fixtures/identities.js';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-settings-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const config = {
    name: 'Studio',
    usage: 'team',
    admins: ['sam'],
    modules: { contributors: true, prototypes: true, notes: true },
    systems: ['studio', 'product', 'brand'],
    systemMaintainers: { product: [], brand: [] },
    defaultSystem: 'product',
  };
  writeProfiles(root, { sam: { name: 'Sam' }, alex: { name: 'Alex' } });
  const { directory } = writeFixtureConfig(root, config, { comment: '// keep this comment\n' });
  fs.writeFileSync(
    path.join(root, 'AGENTS.md'),
    'Shared guidance\n<!-- studio:modules -->\n<!-- /studio:modules -->\n',
  );
  const options = {
    root,
    directory,
    contributors: { sam: { name: 'Sam' }, alex: { name: 'Alex' } },
    systems: ['product', 'brand'],
    platformId: 'studio',
    actor: 'sam',
    modules: [
      { id: 'contributors', label: 'Contributors & Permissions', optional: true },
      { id: 'prototypes', label: 'Prototypes', optional: false },
      {
        id: 'notes',
        label: 'Notes',
        optional: true,
        instructions: [{ path: 'rules/notes.md', when: 'When making notes' }],
        section: { items: 'prototypes', folder: 'src/notes' },
      },
    ],
  };
  options.base = readSettings(root, options.contributors).version;
  return options;
}

test('settings saves enforce Admin authority from current files and preserve rejected changes', t => {
  const options = fixture(t);
  const before = fs.readFileSync(path.join(options.root, 'studio.config.ts'), 'utf8');
  for (const actor of ['alex', 'unknown', null])
    assert.throws(
      () => saveSettings({ ...options, actor, changes: { admins: ['alex'] } }),
      error => error.status === 403,
    );
  for (const changes of [
    { admins: [] },
    { admins: ['missing'] },
    { modules: { prototypes: false } },
    { systems: [] },
    { modules: { missing: true } },
  ]) {
    assert.throws(() => saveSettings({ ...options, changes }));
    assert.equal(fs.readFileSync(path.join(options.root, 'studio.config.ts'), 'utf8'), before);
  }
  saveSettings({ ...options, changes: { admins: ['alex'] } });
  const base = readSettings(options.root, options.contributors).version;
  assert.throws(
    () => saveSettings({ ...options, base, changes: { name: 'Override' } }),
    error => error.status === 403,
  );
});

test('stale configuration and contributor snapshots cannot overwrite current settings', t => {
  const options = fixture(t);
  assert.throws(
    () => saveSettings({ ...options, base: undefined, changes: { name: 'New' } }),
    error => error.status === 409,
  );
  assert.throws(
    () =>
      saveSettings({
        ...options,
        contributors: { ...options.contributors, new: { name: 'New person' } },
        changes: { name: 'New' },
      }),
    error => error.status === 409,
  );
  fs.appendFileSync(path.join(options.root, 'studio.config.ts'), '// changed elsewhere\n');
  assert.throws(
    () => saveSettings({ ...options, changes: { name: 'New' } }),
    error => error.status === 409,
  );
});

test('default changes preserve explicit assignments, None, disabled content, and agent guidance', t => {
  const options = fixture(t);
  const add = (folder, meta) => {
    fs.mkdirSync(path.join(options.root, folder), { recursive: true });
    fs.writeFileSync(path.join(options.root, folder, 'meta.json'), JSON.stringify(meta));
  };
  add('src/prototypes/alex/implicit', { title: 'Pinned', systemId: options.directory.systemIds.product });
  add('src/prototypes/sam/custom', { title: 'Custom', systemId: null });
  add('src/notes/old', { title: 'Retained', systemId: options.directory.systemIds.product });
  const plan = saveSettings({
    ...options,
    changes: { name: 'New Studio', defaultSystem: 'brand', modules: { notes: false } },
  });
  assert.equal(plan.pins.length, 0);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(options.root, 'src/prototypes/alex/implicit/meta.json'))).systemId,
    options.directory.systemIds.product,
  );
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(options.root, 'src/prototypes/sam/custom/meta.json'))).systemId,
    null,
  );
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(options.root, 'src/notes/old/meta.json'))).systemId,
    options.directory.systemIds.product,
  );
  const current = readSettings(options.root, options.contributors);
  assert.equal(current.config.modules.notes, false);
  assert.match(current.source, /keep this comment/);
  assert.doesNotMatch(fs.readFileSync(path.join(options.root, 'AGENTS.md'), 'utf8'), /rules\/notes/);
  saveSettings({ ...options, base: current.version, changes: { modules: { notes: true } } });
  assert.match(fs.readFileSync(path.join(options.root, 'AGENTS.md'), 'utf8'), /rules\/notes/);
});

test('personal local contributors are Admins and switching to team requires an explicit Admin', t => {
  const options = fixture(t);
  saveSettings({ ...options, changes: { usage: 'personal', admins: [] } });
  const base = readSettings(options.root, options.contributors).version;
  assert.throws(
    () => saveSettings({ ...options, base, actor: 'alex', changes: { usage: 'team' } }),
    /at least one Admin/,
  );
  saveSettings({ ...options, base, actor: 'alex', changes: { usage: 'team', admins: ['alex', 'sam'] } });
  assert.deepEqual(readSettings(options.root, options.contributors).config.admins, ['alex', 'sam']);
});

test('CLI plans cannot enable incompatible modules and stale multi-file plans apply nothing', t => {
  const options = fixture(t);
  saveSettings({ ...options, changes: { modules: { notes: false } } });
  assert.throws(
    () =>
      planSettings({
        ...options,
        base: undefined,
        modules: options.modules.map(m => (m.id === 'notes' ? { ...m, requires: '99.0.0' } : m)),
        changes: { modules: { notes: true } },
      }),
    /incompatible/,
  );
  const plan = planSettings({ ...options, base: undefined, changes: { modules: { notes: true } } });
  const before = fs.readFileSync(path.join(options.root, 'studio.config.ts'), 'utf8');
  fs.appendFileSync(path.join(options.root, 'AGENTS.md'), 'Changed elsewhere\n');
  assert.throws(() => applySetupChanges(plan.edits), /changed/);
  assert.equal(fs.readFileSync(path.join(options.root, 'studio.config.ts'), 'utf8'), before);
});

test('full UI snapshots change only the intended source properties', t => {
  const options = fixture(t);
  const before = fs.readFileSync(path.join(options.root, 'studio.config.ts'), 'utf8');
  const config = readSettings(options.root, options.contributors).config;
  const { systems, ...changes } = config;
  saveSettings({ ...options, changes: { ...changes, modules: { ...changes.modules, notes: false } } });
  assert.equal(
    fs.readFileSync(path.join(options.root, 'studio.config.ts'), 'utf8'),
    before.replace('"notes":true', '"notes":false'),
  );
});

test('Admin saves assign system maintainers without creating new studio roles', t => {
  const options = fixture(t);
  const assignments = { product: ['alex'], brand: [] };
  saveSettings({ ...options, changes: { systemMaintainers: assignments } });
  const current = readSettings(options.root, options.contributors);
  assert.deepEqual(current.config.systemMaintainers, assignments);
  assert.throws(
    () => saveSettings({ ...options, actor: 'alex', base: current.version, changes: { admins: ['alex'] } }),
    error => error.status === 403,
  );
  assert.throws(
    () =>
      saveSettings({
        ...options,
        base: current.version,
        changes: { systemMaintainers: { product: ['missing'], brand: [] } },
      }),
    /not a registered contributor/,
  );
});

test('team module cannot be disabled, and personal mode does not erase grants', t => {
  const options = fixture(t);
  assert.throws(() => saveSettings({ ...options, changes: { modules: { contributors: false } } }), /team use requires/);
  saveSettings({ ...options, changes: { usage: 'personal', modules: { contributors: false } } });
  const current = readSettings(options.root, options.contributors);
  assert.deepEqual(current.config.admins, ['sam']);
  assert.deepEqual(current.config.systemMaintainers, { product: [], brand: [] });
  assert.throws(
    () => saveSettings({ ...options, base: current.version, changes: { usage: 'team' } }),
    /team use requires/,
  );
  saveSettings({ ...options, base: current.version, changes: { usage: 'team', modules: { contributors: true } } });
});
