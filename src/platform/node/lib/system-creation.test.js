import { writeProfiles } from './fixtures/contributors.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSystem } from '../../../modules/systems/node/create-system.js';
import { writeFixtureConfig } from './fixtures/identities.js';

const configOf = (admins = ['admin']) => ({
  usage: 'team',
  admins,
  systems: ['studio', 'product'],
  defaultSystem: 'product',
  systemMaintainers: { product: [] },
});

test('system creation requires a current registered Admin and validates input before writing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-system-create-'));
  try {
    writeProfiles(root, { admin: { name: 'Admin' }, member: { name: 'Member' } });
    writeFixtureConfig(root, configOf());
    const config = fs.readFileSync(path.join(root, 'studio.config.ts'), 'utf8');
    for (const actor of [null, 'missing', 'member'])
      assert.throws(() => createSystem(root, actor, { name: 'Product' }), /Admin/);
    for (const body of [
      null,
      [],
      { name: '' },
      { name: '42' },
      { name: 'Kit', source: '/tmp' },
      { name: 'a\ncommand' },
    ]) {
      assert.throws(() => createSystem(root, 'admin', body));
    }
    assert.equal(fs.readFileSync(path.join(root, 'studio.config.ts'), 'utf8'), config);
    assert.equal(fs.existsSync(path.join(root, 'src/systems/kit')), false);
    writeFixtureConfig(root, configOf(['member']));
    assert.throws(() => createSystem(root, 'admin', { name: 'Kit' }), /Admin/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('creation keeps partial scaffolds private and releases its transaction after success or failure', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-system-create-'));
  try {
    writeProfiles(root, { admin: { name: 'Admin' } });
    writeFixtureConfig(root, configOf());
    fs.mkdirSync(path.join(root, 'src/platform/node/cli'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'src/platform/node/cli/studio.js'),
      `
      const fs = require('node:fs');
      if (!fs.existsSync('.studio-system-operation')) process.exit(2);
      setTimeout(() => {
        if (process.argv.includes('broken')) { console.error('Scaffold validation failed'); process.exit(1); }
        fs.appendFileSync('calls', process.argv.includes('--yes') ? 'apply\\n' : 'preview\\n');
        if (process.argv.includes('--yes')) { fs.mkdirSync('src/systems/kit', { recursive: true }); fs.writeFileSync('src/systems/kit/system.ts', "export default { studioId: '0123456789abcdef' };"); }
      }, 40);
    `,
    );
    const pending = createSystem(root, 'admin', { name: 'Kit' });
    assert.equal(fs.existsSync(path.join(root, '.studio-system-operation')), true);
    await assert.rejects(createSystem(root, 'admin', { name: 'Other' }), /in progress/);
    assert.equal(fs.existsSync(path.join(root, '.studio-system-operation')), true);
    assert.deepEqual(await pending, { id: 'kit', studioId: '0123456789abcdef' });
    assert.equal(fs.readFileSync(path.join(root, 'calls'), 'utf8'), 'preview\napply\n');
    assert.equal(fs.existsSync(path.join(root, '.studio-system-operation')), false);
    await assert.rejects(createSystem(root, 'admin', { name: 'Broken' }), /Scaffold validation failed/);
    assert.equal(fs.existsSync(path.join(root, '.studio-system-operation')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
