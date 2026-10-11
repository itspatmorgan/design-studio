import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { checkPackage } from '../check-package.mjs';

function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-plugin-delivery-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'plugin');
  fs.cpSync(new URL('../../../../plugins/design-studio/', import.meta.url), root, { recursive: true });
  return root;
}

test('delivery package is self-contained in an isolated folder', t => {
  const root = fixture(t);
  assert.ok(checkPackage(root).files > 0);
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts/bootstrap.mjs'), 'audit', '--parent', fs.realpathSync(path.dirname(root))],
      { cwd: root, encoding: 'utf8' },
    ),
  );
  assert.equal(result.destinationCheck.available, true);
  assert.ok(path.isAbsolute(result.recommendation.destination));
});
test('rejects maintenance files and unexpected empty directories', t => {
  const root = fixture(t);
  const file = path.join(root, 'scripts/bootstrap.test.mjs');
  fs.writeFileSync(file, '');
  assert.throws(() => checkPackage(root), /Unexpected plugin file/);
  fs.unlinkSync(file);
  fs.mkdirSync(path.join(root, 'experiments'));
  assert.throws(() => checkPackage(root), /Unexpected plugin directory/);
});
test('rejects missing runtime files and linked files', t => {
  const root = fixture(t);
  const file = path.join(root, 'scripts/toolchain.mjs');
  fs.unlinkSync(file);
  assert.throws(() => checkPackage(root), /Missing plugin file/);
  fs.symlinkSync(import.meta.filename, file);
  assert.throws(() => checkPackage(root), /Plugin links are not allowed/);
});
test('rejects imports that escape the package or require repository dependencies', t => {
  const root = fixture(t);
  const file = path.join(root, 'scripts/bootstrap.mjs');
  const source = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, source + "\nimport '../../maintenance.mjs';\n");
  assert.throws(() => checkPackage(root), /escapes package/);
  fs.writeFileSync(file, source + "\nimport 'repository-only-dependency';\n");
  assert.throws(() => checkPackage(root), /external runtime module/);
});
test('rejects broken skill links and manifest assets', t => {
  const root = fixture(t);
  const file = path.join(root, 'skills/create-studio/SKILL.md');
  const source = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, source + '\n[Missing procedure](missing.md)\n');
  assert.throws(() => checkPackage(root), /Missing plugin reference/);
  fs.writeFileSync(file, source);
  const manifestFile = path.join(root, 'plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.extensions['com.openai'].interface.logo = './assets/missing.svg';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.throws(() => checkPackage(root), /Missing plugin reference/);
});
