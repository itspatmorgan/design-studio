import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { computeContract, SNAPSHOT_FILE } from './contract.js';
import { releasedBaseline, releasedProblems } from './released-contract.js';
const base = computeContract();
const baseline = () => ({ tag: 'v0.3.0', snapshot: structuredClone(base) });

test('the public launch starts without historical pre-release compatibility', () => {
  assert.deepEqual(releasedProblems(base, null), []);
  assert.match(
    releasedProblems({ ...base, platformVersion: '0.3.1' }, null)[0],
    /No preceding supported public release/,
  );
});

test('refreshing a future snapshot or a patch bump cannot conceal stable changes', () => {
  for (const change of [
    now => {
      now.types.ModuleSpec.signature = now.types.ModuleSpec.signature.replace('requires: string', 'requires: number');
    },
    now => {
      delete now.api['#studio/module'].ModuleCheck;
    },
    now => {
      now.api['#studio/module'].ModuleServer.signature = '(input: string) => void';
    },
    now => {
      now.runtimeRequirements.node = '>=25';
    },
    now => {
      now.formatVersions.prototype++;
    },
  ]) {
    const now = structuredClone(base);
    now.platformVersion = '0.3.1';
    change(now);
    assert.match(releasedProblems(now, baseline())[0], /require a minor version increase/);
    now.platformVersion = '0.4.0';
    assert.deepEqual(releasedProblems(now, baseline()), []);
  }
  const experimental = structuredClone(base);
  experimental.platformVersion = '0.3.1';
  experimental.api['#studio/data'].contribution.signature = '() => undefined';
  assert.deepEqual(releasedProblems(experimental, baseline()), []);
});

test('tag selection ignores old layouts, excludes the candidate tag and rejects invalid supported snapshots', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-public-baseline-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.test');
  git('config', 'commit.gpgsign', 'false');
  const file = path.join(root, SNAPSHOT_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const commit = value => {
    fs.writeFileSync(file, value);
    git('add', '.');
    git('commit', '-q', '--no-verify', '-m', 'Fixture');
  };
  commit('not a supported snapshot');
  git('tag', 'v0.2.1');
  assert.equal(releasedBaseline(root), null);
  commit(JSON.stringify(base));
  git('tag', 'v0.3.0');
  fs.writeFileSync(path.join(root, 'uncommitted.txt'), 'candidate work');
  assert.equal(releasedBaseline(root, '0.3.0').tag, 'v0.3.0', 'dirty source must compare against the tagged HEAD');
  fs.rmSync(path.join(root, 'uncommitted.txt'));
  commit(JSON.stringify({ ...base, platformVersion: '0.3.1' }));
  git('tag', 'v0.3.1');
  assert.equal(releasedBaseline(root).tag, 'v0.3.0', 'candidate own tag is excluded');
  fs.writeFileSync(path.join(root, 'marker.txt'), 'next');
  git('add', '.');
  git('commit', '-q', '--no-verify', '-m', 'Later');
  assert.equal(releasedBaseline(root).tag, 'v0.3.1');
  commit(JSON.stringify({ ...base, platformVersion: '0.4.0', snapshotVersion: 1 }));
  git('tag', 'v0.4.0');
  fs.writeFileSync(path.join(root, 'marker.txt'), 'later');
  git('add', '.');
  git('commit', '-q', '--no-verify', '-m', 'Later again');
  assert.throws(() => releasedBaseline(root), /invalid public contract snapshot/);
});

test('the actual CLI refuses a refreshed patch snapshot against its public tag', t => {
  const original = path.resolve(import.meta.dirname, '../../../..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-contract-cli-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(original, root, {
    recursive: true,
    filter: file => !['node_modules', 'dist', '.git'].includes(path.basename(file)),
  });
  fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.test');
  git('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(root, '.git/info/exclude'), 'node_modules\n');
  execFileSync(process.execPath, ['src/platform/node/check/check-contract.js'], { cwd: root, stdio: 'pipe' });
  git('add', '.');
  git('commit', '-q', '--no-verify', '-m', 'Synthetic public baseline');
  git('tag', 'v0.3.0');
  fs.writeFileSync(path.join(root, 'uncommitted.txt'), 'candidate work');
  assert.equal(releasedBaseline(root, '0.3.0').tag, 'v0.3.0', 'dirty source must compare against the tagged HEAD');
  fs.rmSync(path.join(root, 'uncommitted.txt'));
  const module = path.join(root, 'src/platform/core/modules/index.ts');
  fs.writeFileSync(
    module,
    fs
      .readFileSync(module, 'utf8')
      .replace("PLATFORM_VERSION = '0.3.0'", "PLATFORM_VERSION = '0.3.1'")
      .replace('description?: string;', 'description?: string | number;'),
  );
  const cli = ['src/platform/node/check/check-contract.js'];
  execFileSync(process.execPath, [...cli, '--update'], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, cli, { cwd: root, stdio: 'pipe' });
  const result = spawnSync(process.execPath, [...cli, '--released'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /against v0.3.0 require a minor version increase/);
});
