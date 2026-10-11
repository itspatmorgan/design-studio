import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mergeUpstream } from './upstream-merge.js';
import { syncSkillAdapters } from './agent-skills.js';

const repositories = [];
test.after(() => {
  for (const dir of repositories) fs.rmSync(dir, { recursive: true, force: true });
});

// A repository with an upstream branch and a studio branch that both change the same files.
function studio(changes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upstream-merge-'));
  repositories.push(dir);
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
      { tier: 'generated', paths: ['pnpm-lock.yaml', 'AGENTS.md', '.agents/**', '.claude/**'] },
      { tier: 'seed', paths: ['studio.config.json', 'README.md', 'AGENTS.team.md', 'src/prototypes/sam/**'] },
      { tier: 'team', paths: ['src/systems/**', 'src/modules/**', 'studio.lock.json'] },
    ],
    mixed: [{ paths: ['package.json'], reason: 'Team module dependencies share upstream tooling.' }],
  };
  write({
    '.studio/ownership.json': JSON.stringify(map),
    'pnpm-lock.yaml': 'base\n',
    'README.md': 'base\n',
    'src/platform/a.ts': 'base\n',
    'src/prototypes/sam/p/view.tsx': 'base\n',
    ...changes.base,
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

test('a seed file upstream deleted keeps even an unchanged studio copy and receives its replacement', () => {
  const { dir, git, read } = renamedSeed();
  withSeedFile(dir, git);
  upstreamRenames(dir, git);
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: true, changed: true });
  assert.equal(read('settings.old.txt'), 'base\n');
  assert.equal(read('settings.new.txt'), 'release\n');
});

test('a deleted unlisted file is team-owned and keeps the studio copy', () => {
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
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: true, changed: true });
  assert.equal(fs.readFileSync(path.join(dir, 'notes.old.txt'), 'utf8'), 'team\n');
});

test('clean upstream edits preserve complete seed and team bytes, including unchanged files', () => {
  const original = 'first\n\n\n\n\n\nlast\n';
  const { dir, git, read } = studio({
    base: {
      'README.md': original,
      'studio.config.json': '{"name":"Original studio"}\n',
      'src/systems/kit/package.json': '{"dependencies":{"clsx":"2.1.1"}}\n',
    },
    studio: { 'README.md': original.replace('first', 'team first') },
    upstream: {
      'README.md': original.replace('last', 'release last'),
      'studio.config.json': '{"name":"Release defaults"}\n',
      'src/prototypes/sam/p/view.tsx': 'release sample\n',
      'src/systems/kit/package.json': '{"dependencies":{}}\n',
    },
  });
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.equal(read('README.md'), original.replace('first', 'team first'));
  assert.equal(read('studio.config.json'), '{"name":"Original studio"}\n');
  assert.equal(read('src/prototypes/sam/p/view.tsx'), 'base\n');
  assert.equal(read('src/systems/kit/package.json'), '{"dependencies":{"clsx":"2.1.1"}}\n');
  assert.equal(git('status', '--porcelain'), '');
});

test('new seed files take release bytes, while deleted seed files and incoming team additions stay absent', () => {
  const { dir, git, read } = studio({
    studio: { 'README.md': 'team\n' },
    upstream: { 'AGENTS.team.md': 'new seed\n', 'src/modules/foreign/module.ts': 'foreign\n' },
  });
  git('rm', '-q', 'src/prototypes/sam/p/view.tsx');
  git('commit', '-q', '-m', 'delete sample');
  git('checkout', '-q', 'upstream');
  fs.writeFileSync(path.join(dir, 'src/prototypes/sam/p/view.tsx'), 'release sample\n');
  git('commit', '-q', '-am', 'edit deleted seed');
  git('checkout', '-q', 'studio');
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.equal(read('AGENTS.team.md'), 'new seed\n');
  assert.equal(fs.existsSync(path.join(dir, 'src/prototypes/sam/p/view.tsx')), false);
  assert.equal(fs.existsSync(path.join(dir, 'src/modules/foreign/module.ts')), false);
  assert.deepEqual(git('ls-files').split('\n'), [
    '.studio/ownership.json',
    'AGENTS.team.md',
    'README.md',
    'pnpm-lock.yaml',
    'src/platform/a.ts',
  ]);
});

test('changing a protected path to upstream or generated does not relinquish the studio copy', () => {
  const { dir, git, read } = studio({
    studio: { 'README.md': 'team\n' },
    upstream: { 'README.md': 'release\n', 'src/prototypes/sam/p/view.tsx': 'release sample\n' },
  });
  git('checkout', '-q', 'upstream');
  const map = JSON.parse(read('.studio/ownership.json'));
  map.rules = map.rules.map(rule =>
    rule.tier === 'seed' ? { ...rule, tier: 'upstream', paths: ['README.md', 'AGENTS.team.md'] } : rule,
  );
  map.rules.push({ tier: 'generated', paths: ['src/prototypes/sam/**'] });
  fs.writeFileSync(path.join(dir, '.studio/ownership.json'), JSON.stringify(map));
  git('commit', '-q', '-am', 'change ownership');
  git('checkout', '-q', 'studio');
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.equal(read('README.md'), 'team\n');
  assert.equal(read('src/prototypes/sam/p/view.tsx'), 'base\n');
  assert.deepEqual(JSON.parse(read('.studio/ownership.json')), map);
});

test('generated files take the complete release copy even in clean merges, including deletion', () => {
  const original = 'first\n\n\n\n\n\nlast\n';
  const { dir, git, read } = studio({
    base: { 'pnpm-lock.yaml': original, 'AGENTS.md': 'base instructions\n' },
    studio: { 'pnpm-lock.yaml': original.replace('first', 'team first') },
    upstream: { 'pnpm-lock.yaml': original.replace('last', 'release last') },
  });
  git('checkout', '-q', 'upstream');
  git('rm', '-q', 'AGENTS.md');
  git('commit', '-q', '-m', 'remove generated output');
  git('checkout', '-q', 'studio');
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.equal(read('pnpm-lock.yaml'), original.replace('last', 'release last'));
  assert.equal(fs.existsSync(path.join(dir, 'AGENTS.md')), false);
});

test('mixed package dependencies merge with upstream tooling and workspace dependencies remain exact', () => {
  const base = '{\n  "scripts": {"build": "old"},\n\n\n\n\n\n  "dependencies": {}\n}\n';
  const team = base.replace('"dependencies": {}', '"dependencies": {"clsx": "2.1.1"}');
  const release = base.replace('"build": "old"', '"build": "new"');
  const system = '{"dependencies":{"clsx":"2.1.1"}}\n';
  const { dir, read } = studio({
    base: { 'package.json': base, 'src/systems/kit/package.json': system },
    studio: { 'package.json': team },
    upstream: { 'package.json': release, 'src/systems/kit/package.json': '{"dependencies":{}}\n' },
  });
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.deepEqual(JSON.parse(read('package.json')), { scripts: { build: 'new' }, dependencies: { clsx: '2.1.1' } });
  assert.equal(read('src/systems/kit/package.json'), system);
});

test('a mixed dependency conflict remains reviewable and regeneration does not run', () => {
  const { dir } = studio({
    base: { 'package.json': '{"dependencies":{}}\n' },
    studio: { 'package.json': '{"dependencies":{"clsx":"2.1.1"}}\n' },
    upstream: { 'package.json': '{"dependencies":{"clsx":"2.0.0"}}\n' },
  });
  commands.length = 0;
  assert.deepEqual(mergeUpstream(dir, 'upstream', { run }), { merged: false, conflicts: ['package.json'] });
  assert.deepEqual(commands, []);
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

test('a detected seed rename keeps the original and installs the complete replacement without team edits', () => {
  const original = Array.from({ length: 30 }, (_, i) => `seed line ${i}\n`).join('');
  const { dir, git, read } = studio({
    base: { 'src/prototypes/sam/p/old.txt': original },
    studio: { 'src/prototypes/sam/p/old.txt': original.replace('seed line 0', 'team line 0') },
    upstream: { 'src/platform/a.ts': 'release\n' },
  });
  git('checkout', '-q', 'upstream');
  git('mv', 'src/prototypes/sam/p/old.txt', 'src/prototypes/sam/p/new.txt');
  git('commit', '-q', '-m', 'rename seed');
  assert.match(git('diff', '--name-status', '--find-renames', 'HEAD^', 'HEAD'), /^R100/m);
  git('checkout', '-q', 'studio');
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.equal(read('src/prototypes/sam/p/old.txt'), original.replace('seed line 0', 'team line 0'));
  assert.equal(read('src/prototypes/sam/p/new.txt'), original);
});

test('protected binary bytes, executable mode, and paths containing tabs survive clean upstream edits', () => {
  const file = 'src/modules/kit/a\tb.bin';
  const original = Buffer.from([0, 1, 255, 10]);
  const { dir, git } = studio({
    base: { [file]: original },
    studio: { 'README.md': 'team\n' },
    upstream: { [file]: Buffer.from([0, 2, 254, 10]) },
  });
  fs.chmodSync(path.join(dir, file), 0o755);
  git('add', '--', file);
  git('commit', '-q', '-m', 'team executable');
  assert.equal(mergeUpstream(dir, 'upstream', { run }).merged, true);
  assert.deepEqual(fs.readFileSync(path.join(dir, file)), original);
  assert.match(git('ls-files', '--stage', '-z', '--', file), /^100755 /);
});

test('adapter regeneration updates managed entries and preserves team modifications using the studio receipt', () => {
  const skill = (folder, description) => ({
    owner: { kind: 'platform', root: 'src/platform' },
    folder,
    name: `studio-platform-${folder}`,
    description,
    source: `src/platform/skills/${folder}/SKILL.md`,
  });
  const catalog = [skill('review', 'Review.'), skill('obsolete', 'Obsolete.'), skill('edited', 'Edited.')];
  const { dir, git, read } = studio({
    studio: { 'README.md': 'team\n' },
    upstream: { 'src/platform/a.ts': 'release\n' },
  });
  syncSkillAdapters(dir, catalog);
  git('add', '-A');
  git('commit', '-q', '-m', 'studio adapters');
  const edited = '.agents/skills/studio-platform-edited/SKILL.md';
  fs.writeFileSync(path.join(dir, edited), 'Team adapter edit\n');
  fs.mkdirSync(path.join(dir, '.agents/skills/personal'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agents/skills/personal/SKILL.md'), 'Personal procedure\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'custom adapters');
  git('checkout', '-q', 'upstream');
  syncSkillAdapters(dir, [skill('review', 'Review the release.')]);
  git('add', '-A');
  git('commit', '-q', '-m', 'release adapters');
  git('checkout', '-q', 'studio');
  let result;
  assert.equal(
    mergeUpstream(dir, 'upstream', {
      run: (command, args) => {
        if (args.join(' ') === 'studio sync') result = syncSkillAdapters(dir, [skill('review', 'Review the release.')]);
      },
    }).merged,
    true,
  );
  assert.equal(read(edited), 'Team adapter edit\n');
  assert.equal(read('.agents/skills/personal/SKILL.md'), 'Personal procedure\n');
  assert.equal(fs.existsSync(path.join(dir, '.agents/skills/studio-platform-obsolete')), false);
  assert.match(read('.agents/skills/studio-platform-review/SKILL.md'), /Review the release/);
  assert.match(result.warnings.join('\n'), /Preserved modified obsolete/);
  assert.equal(git('status', '--porcelain'), '');
});
