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
  const text = (file, source) => fs.writeFileSync(path.join(dir, file), source);
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
  return { git, write, text, run };
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

const configure = assetGuard => JSON.stringify({ formatVersion: 1, assetGuard });

test("a team approves a file or sets its own limit in studio.config.json's assetGuard", t => {
  const { git, write, text, run } = repo(t);
  write('tour.mp4', 800);
  git('add', '.');
  const blocked = run('--staged');
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /assetGuard\.exceptions in studio\.config\.json and stage that too/);
  assert.match(blocked.stderr, /assets\.md#large-files/);

  // An approval counts once staged, not while it's only on disk.
  text('studio.config.json', configure({ exceptions: [{ path: 'tour.mp4', reason: 'Already compressed' }] }));
  assert.equal(run('--staged').status, 1);
  git('add', 'studio.config.json');
  assert.equal(run('--staged').status, 0);

  text('studio.config.json', configure({ limitKB: 1000 }));
  git('add', 'studio.config.json');
  assert.equal(run('--staged').status, 0);
  git('commit', '-qm', 'add');
  write('big.png', 1200);
  git('add', '.');
  git('commit', '-qm', 'big');
  const ci = run('--ci', git('rev-parse', 'HEAD~1').trim(), git('rev-parse', 'HEAD').trim());
  assert.equal(ci.status, 1);
  assert.match(ci.stderr, /over 1000 KB[\s\S]*big\.png: 1200 KB[\s\S]*in this change/);
});

test('an invalid assetGuard stops the check and names the entry', t => {
  const { git, write, text, run } = repo(t);
  write('small.png', 10);
  text('studio.config.json', configure({ exceptions: [{ path: './tour.mp4', reason: 'why' }] }));
  git('add', '.');
  const r = run('--staged');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /assetGuard\.exceptions\[0\]: "\.\/tour\.mp4" should be the file's path from the repository root/);
});
