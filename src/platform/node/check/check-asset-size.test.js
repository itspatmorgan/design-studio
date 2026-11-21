import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const SCRIPT = path.resolve('src/platform/node/check/check-asset-size.js');

function repo(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-size-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  const write = (file, kb) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), Buffer.alloc(kb * 1024, 1));
  };
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
  return { git, write, run };
}

// Git quotes names like these unless asked not to (#112).
for (const name of ['café.jpg', '1 · Intro/A · Screen.tsx']) {
  test(`a small staged "${name}" passes`, t => {
    const { git, write, run } = repo(t);
    write(name, 10);
    git('add', '.');
    const r = run('--staged');
    assert.equal(r.status, 0, r.stderr);
  });
}

test('an oversized "café.mp4" is blocked by name in --staged and --ci', t => {
  const { git, write, run } = repo(t);
  write('café.mp4', 800);
  git('add', '.');
  const staged = run('--staged');
  assert.equal(staged.status, 1, staged.stderr);
  assert.match(staged.stdout + staged.stderr, /café\.mp4: 800 KB/);
  git('commit', '-qm', 'add');
  const ci = run('--ci', '0000000000000000000000000000000000000000', git('rev-parse', 'HEAD').trim());
  assert.equal(ci.status, 1, ci.stderr);
  assert.match(ci.stdout + ci.stderr, /café\.mp4: 800 KB/);
});
