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
  const write = files => {
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    }
  };
  git('init', '-q', '-b', 'upstream');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.test');
  git('config', 'commit.gpgsign', 'false');
  const map = {
    schema: 1,
    rules: [
      { tier: 'upstream', paths: ['src/platform/**', '.studio/ownership.json'] },
      { tier: 'generated', paths: ['pnpm-lock.yaml', 'AGENTS.md'] },
      { tier: 'seed', paths: ['README.md', 'AGENTS.team.md', 'src/prototypes/sam/**'] },
    ],
  };
  write({
    '.studio/ownership.json': JSON.stringify(map),
    'pnpm-lock.yaml': 'base\n',
    'README.md': 'base\n',
    'src/platform/a.ts': 'base\n',
    'src/prototypes/sam/p/view.tsx': 'base\n',
  });
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'studio');
  write(changes.studio);
  git('add', '-A');
  git('commit', '-q', '-m', 'team');
  git('checkout', '-q', 'upstream');
  write(changes.upstream);
  git('add', '-A');
  git('commit', '-q', '-m', 'release');
  git('checkout', '-q', 'studio');
  return { dir, git, read: file => fs.readFileSync(path.join(dir, file), 'utf8') };
}
const commands = [];
const run = (command, args) => commands.push([command, ...args].join(' '));

test('generated files take upstream, seed files keep the team copy, and the result is regenerated', () => {
  const { dir, git, read } = studio({
    studio: { 'pnpm-lock.yaml': 'team\n', 'README.md': 'team\n' },
    upstream: { 'pnpm-lock.yaml': 'release\n', 'README.md': 'release\n', 'src/platform/a.ts': 'release\n' },
  });
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
  const { dir, read } = studio({
    studio: { 'src/prototypes/sam/p/view.tsx': 'team\n' },
    upstream: { 'src/platform/a.ts': 'release\n' },
  });
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

test('AGENTS.md is generated and takes upstream; the team file AGENTS.team.md keeps the team copy', () => {
  const { dir, read } = studio({
    studio: { 'AGENTS.md': 'team text\n', 'AGENTS.team.md': 'team guidance\n' },
    upstream: { 'AGENTS.md': 'release text\n', 'AGENTS.team.md': 'seed\n' },
  });
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.equal(read('AGENTS.md'), 'release text\n');
  assert.equal(read('AGENTS.team.md'), 'team guidance\n');
});

// Upstream renames a seed file (settings.old.txt to settings.new.txt) and its map then lists only the new name.
const renamedSeed = () =>
  studio({ studio: { 'src/prototypes/sam/p/view.tsx': 'team\n' }, upstream: { 'src/platform/a.ts': 'release\n' } });
const withSeedFile = (dir, git) => {
  // Put settings.old.txt (a seed file) in the shared base, so both branches start with it.
  git('checkout', '-q', 'upstream');
  fs.writeFileSync(path.join(dir, 'settings.old.txt'), 'base\n');
  const map = JSON.parse(fs.readFileSync(path.join(dir, '.studio/ownership.json'), 'utf8'));
  map.rules.push({ tier: 'seed', paths: ['settings.old.txt'] });
  fs.writeFileSync(path.join(dir, '.studio/ownership.json'), JSON.stringify(map));
  git('add', '-A');
  git('commit', '-q', '-m', 'seed file');
  git('checkout', '-q', 'studio');
  git('merge', '-q', '--no-edit', 'upstream');
};
const upstreamRenames = (dir, git) => {
  git('checkout', '-q', 'upstream');
  git('rm', '-q', 'settings.old.txt');
  fs.writeFileSync(path.join(dir, 'settings.new.txt'), 'release\n');
  const map = JSON.parse(fs.readFileSync(path.join(dir, '.studio/ownership.json'), 'utf8'));
  map.rules = map.rules.map(rule => ({
    ...rule,
    paths: rule.paths.map(file => (file === 'settings.old.txt' ? 'settings.new.txt' : file)),
  }));
  fs.writeFileSync(path.join(dir, '.studio/ownership.json'), JSON.stringify(map));
  git('add', '-A');
  git('commit', '-q', '-m', 'rename seed file');
  git('checkout', '-q', 'studio');
};

test('a seed file upstream deleted keeps the team’s edited copy and receives its replacement', () => {
  const { dir, git, read } = renamedSeed();
  withSeedFile(dir, git);
  fs.writeFileSync(path.join(dir, 'settings.old.txt'), 'team\n');
  git('commit', '-q', '-am', 'team edits settings');
  upstreamRenames(dir, git);
  commands.length = 0;
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: true, changed: true });
  assert.equal(read('settings.old.txt'), 'team\n', 'the team’s copy stays for a person to move');
  assert.equal(read('settings.new.txt'), 'release\n');
  assert.equal(git('status', '--porcelain'), '');
  assert.deepEqual(commands, ['pnpm install --no-frozen-lockfile', 'pnpm studio sync']);
});

test('a seed file upstream deleted that the team never edited is simply removed', () => {
  const { dir, git, read } = renamedSeed();
  withSeedFile(dir, git);
  upstreamRenames(dir, git);
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: true, changed: true });
  assert.equal(fs.existsSync(path.join(dir, 'settings.old.txt')), false);
  assert.equal(read('settings.new.txt'), 'release\n');
});

test('a deleted file that the studio’s own map does not list as seed is still reported', () => {
  const { dir, git } = renamedSeed();
  git('checkout', '-q', 'upstream');
  fs.writeFileSync(path.join(dir, 'notes.old.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'unlisted file');
  git('checkout', '-q', 'studio');
  git('merge', '-q', '--no-edit', 'upstream');
  fs.writeFileSync(path.join(dir, 'notes.old.txt'), 'team\n');
  git('commit', '-q', '-am', 'team edits it');
  git('checkout', '-q', 'upstream');
  git('rm', '-q', 'notes.old.txt');
  git('commit', '-q', '-m', 'delete it');
  git('checkout', '-q', 'studio');
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: false, conflicts: ['notes.old.txt'] });
});

test('beforeRegenerate runs after conflicts are resolved and before regeneration, and its edits are committed', () => {
  const { dir, git, read } = studio({
    studio: { 'src/prototypes/sam/p/view.tsx': 'team\n' },
    upstream: { 'src/platform/a.ts': 'release\n' },
  });
  const order = [];
  const result = mergeUpstream(dir, 'upstream', {
    run: (command, args) => order.push([command, ...args].join(' ')),
    beforeRegenerate: () => {
      order.push('before');
      fs.writeFileSync(path.join(dir, 'src/prototypes/sam/p/view.tsx'), 'stamped\n');
    },
  });
  assert.equal(result.merged, true);
  assert.deepEqual(order, ['before', 'pnpm install --no-frozen-lockfile', 'pnpm studio sync']);
  assert.equal(read('src/prototypes/sam/p/view.tsx'), 'stamped\n');
  assert.equal(git('status', '--porcelain'), '');
});
