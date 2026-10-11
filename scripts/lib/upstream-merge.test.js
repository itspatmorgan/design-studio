import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mergeUpstream } from './upstream-merge.js';

// A repository with an upstream branch and a studio branch that both change the same files.
function studio(changes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upstream-merge-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const write = files => { for (const [file, text] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), text); } };
  git('init', '-q', '-b', 'upstream');
  git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.test'); git('config', 'commit.gpgsign', 'false');
  write({ 'pnpm-lock.yaml': 'base\n', 'README.md': 'base\n', 'src/platform/a.ts': 'base\n', 'src/prototypes/sam/p/view.tsx': 'base\n' });
  git('add', '-A'); git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'studio');
  write(changes.studio); git('add', '-A'); git('commit', '-q', '-m', 'team');
  git('checkout', '-q', 'upstream');
  write(changes.upstream); git('add', '-A'); git('commit', '-q', '-m', 'release');
  git('checkout', '-q', 'studio');
  return { dir, git, read: file => fs.readFileSync(path.join(dir, file), 'utf8') };
}
const commands = [];
const run = (command, args) => commands.push([command, ...args].join(' '));

test('generated files take upstream, seed files keep the team copy, and the result is regenerated', () => {
  const { dir, git, read } = studio({ studio: { 'pnpm-lock.yaml': 'team\n', 'README.md': 'team\n' }, upstream: { 'pnpm-lock.yaml': 'release\n', 'README.md': 'release\n', 'src/platform/a.ts': 'release\n' } });
  commands.length = 0;
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: true, changed: true });
  assert.equal(read('pnpm-lock.yaml'), 'release\n');
  assert.equal(read('README.md'), 'team\n');
  assert.equal(read('src/platform/a.ts'), 'release\n');
  assert.deepEqual(commands, ['pnpm install --no-frozen-lockfile', 'pnpm studio sync']);
  assert.equal(git('status', '--porcelain'), '');
});

test('a conflicting upstream edit to a team-changed platform file is reported, not resolved', () => {
  const { dir } = studio({ studio: { 'src/platform/a.ts': 'team\n' }, upstream: { 'src/platform/a.ts': 'release\n' } });
  commands.length = 0;
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: false, conflicts: ['src/platform/a.ts'] });
  assert.deepEqual(commands, []);
});

test('a team deletion of a seed file survives an upstream edit', () => {
  const { dir, read } = studio({ studio: { 'src/prototypes/sam/p/view.tsx': 'team\n' }, upstream: { 'src/platform/a.ts': 'release\n' } });
  fs.rmSync(path.join(dir, 'README.md'));
  execFileSync('git', ['commit', '-q', '-am', 'drop readme'], { cwd: dir });
  execFileSync('git', ['checkout', '-q', 'upstream'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'README.md'), 'release\n');
  execFileSync('git', ['commit', '-q', '-am', 'readme'], { cwd: dir });
  execFileSync('git', ['checkout', '-q', 'studio'], { cwd: dir });
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.equal(fs.existsSync(path.join(dir, 'README.md')), false);
  assert.equal(read('src/prototypes/sam/p/view.tsx'), 'team\n');
});

test('an already merged revision changes nothing', () => {
  const { dir, git } = studio({ studio: { 'README.md': 'team\n' }, upstream: { 'src/platform/a.ts': 'release\n' } });
  mergeUpstream(dir, 'upstream', { run });
  const before = git('rev-parse', 'HEAD');
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: true, changed: false });
  assert.equal(git('rev-parse', 'HEAD'), before);
});
