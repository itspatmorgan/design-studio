import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { applyUpdate, continueUpdate, planUpdate } from './studio-update.js';
import { readLock } from './lock.js';

const MAP = {
  schema: 1,
  rules: [
    { tier: 'upstream', paths: ['src/platform/**', '.studio/ownership.json'] },
    { tier: 'generated', paths: ['pnpm-lock.yaml'] },
    { tier: 'seed', paths: ['README.md'] },
    { tier: 'team', paths: ['studio.lock.json', 'src/prototypes/**'] },
  ],
};
const IDENTITY = [
  ['user.name', 'Test'],
  ['user.email', 'test@example.test'],
  ['commit.gpgsign', 'false'],
  ['tag.gpgsign', 'false'],
];

function repo(dir) {
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: 'pipe' }).trim();
  const write = files => {
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    }
  };
  const commit = (files, message) => {
    write(files);
    git('add', '-A');
    git('commit', '-q', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  return { dir, git, write, commit, read: file => fs.readFileSync(path.join(dir, file), 'utf8') };
}

// An upstream project with release v0.2.0 and a studio cloned from it with an `upstream` remote.
function setup({ remote = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-update-'));
  fs.mkdirSync(path.join(root, 'upstream'));
  const upstream = repo(path.join(root, 'upstream'));
  upstream.git('init', '-q', '-b', 'main');
  for (const [key, value] of IDENTITY) upstream.git('config', key, value);
  upstream.commit(
    {
      '.studio/ownership.json': JSON.stringify(MAP),
      'pnpm-lock.yaml': 'base\n',
      'README.md': 'base\n',
      'src/platform/a.ts': 'base\n',
      'src/platform/b.ts': 'base\n',
    },
    'base',
  );
  upstream.git('tag', '-a', 'v0.2.0', '-m', 'v0.2.0');
  execFileSync('git', ['clone', '-q', upstream.dir, path.join(root, 'studio')], { stdio: 'ignore' });
  const studio = repo(path.join(root, 'studio'));
  for (const [key, value] of IDENTITY) studio.git('config', key, value);
  studio.git('remote', 'rename', 'origin', remote ? 'upstream' : 'elsewhere');
  studio.git('tag', '-d', 'v0.2.0');
  const release = (version, files) => {
    const commit = upstream.commit(files, `release ${version}`);
    upstream.git('tag', '-a', `v${version}`, '-m', `v${version}`);
    return commit;
  };
  return { root, upstream, studio, release };
}
const recorder = ({ fail } = {}) => {
  const commands = [];
  const run = (command, args) => {
    commands.push([command, ...args].join(' '));
    if (fail && args.join(' ') === fail) throw new Error(`${fail} failed`);
  };
  return { commands, run };
};

test('without an upstream remote the update says how to add one', () => {
  const { studio } = setup({ remote: false });
  const plan = planUpdate(studio.dir);
  assert.match(plan.problems[0], /no "upstream" remote/);
  assert.deepEqual(plan.help, ['git remote add upstream https://github.com/itspatmorgan/design-studio-starter.git']);
});

test('a dirty working tree is refused', () => {
  const { studio, release } = setup();
  release('0.2.1', { 'src/platform/a.ts': 'release\n' });
  studio.write({ 'notes.txt': 'draft\n' });
  assert.match(planUpdate(studio.dir).problems.join('\n'), /Commit or stash your changes first/);
});

test('a dry run names the latest release, the range, and the files both sides changed, and changes nothing', () => {
  const { studio, release } = setup();
  studio.commit({ 'README.md': 'team\n', 'src/platform/a.ts': 'team\n', 'src/prototypes/me/p.tsx': 'mine\n' }, 'team');
  release('0.2.1', { 'src/platform/b.ts': 'release\n' });
  const latest = release('0.3.0', {
    'README.md': 'release\n',
    'src/platform/a.ts': 'release\n',
    'pnpm-lock.yaml': 'r\n',
  });
  const head = studio.git('rev-parse', 'HEAD');
  const plan = planUpdate(studio.dir);
  assert.deepEqual(plan.problems, []);
  assert.equal(plan.tag, 'v0.3.0');
  assert.equal(plan.commit, latest);
  assert.equal(plan.installed, null, 'no lock: an unknown release');
  assert.equal(plan.baseSource, 'merge-base');
  assert.equal(plan.commits, 2);
  assert.deepEqual(plan.upstreamChanged.sort(), [
    'README.md',
    'pnpm-lock.yaml',
    'src/platform/a.ts',
    'src/platform/b.ts',
  ]);
  assert.deepEqual(plan.overlap, [
    { file: 'README.md', tier: 'seed', resolution: 'keeps your copy' },
    {
      file: 'src/platform/a.ts',
      tier: 'upstream',
      resolution: 'merged; if you both changed the same lines, you choose',
    },
  ]);
  assert.equal(studio.git('rev-parse', 'HEAD'), head);
  assert.equal(studio.git('branch', '--list', 'studio-update/*'), '');
  assert.equal(studio.git('status', '--porcelain'), '');
});

test('a named version is used, and an unknown one is refused', () => {
  const { studio, release } = setup();
  release('0.2.1', { 'src/platform/b.ts': 'one\n' });
  release('0.3.0', { 'src/platform/b.ts': 'two\n' });
  assert.equal(planUpdate(studio.dir, '0.2.1').tag, 'v0.2.1');
  assert.equal(planUpdate(studio.dir, 'v0.2.1').tag, 'v0.2.1');
  assert.match(
    planUpdate(studio.dir, '0.9.0').problems[0],
    /no release v0\.9\.0\. Releases: v0\.3\.0, v0\.2\.1, v0\.2\.0/,
  );
});

test('a studio that already has the release does nothing', () => {
  const { studio } = setup();
  const plan = planUpdate(studio.dir);
  assert.equal(plan.tag, 'v0.2.0');
  assert.equal(plan.upToDate, true);
});

test('the team’s own tags are never replaced by upstream release tags', () => {
  const { studio, release } = setup();
  studio.git('tag', 'v0.2.1');
  const team = studio.git('rev-parse', 'v0.2.1');
  release('0.2.1', { 'src/platform/b.ts': 'release\n' });
  assert.equal(planUpdate(studio.dir).tag, 'v0.2.1');
  assert.equal(studio.git('rev-parse', 'refs/tags/v0.2.1'), team);
});

test('a clean update merges on its own branch, records the release in the merge commit, and verifies', () => {
  const { studio, release } = setup();
  studio.commit({ 'README.md': 'team\n' }, 'team');
  const original = studio.git('rev-parse', 'main');
  const commit = release('0.2.1', { 'README.md': 'release\n', 'src/platform/a.ts': 'release\n' });
  const plan = planUpdate(studio.dir);
  const { run, commands } = recorder();
  assert.deepEqual(applyUpdate(studio.dir, plan, { run }), { merged: true, checks: 'passed' });
  assert.equal(studio.git('symbolic-ref', '--short', 'HEAD'), 'studio-update/v0.2.1');
  assert.equal(studio.git('rev-parse', 'main'), original, 'the original branch is untouched');
  assert.equal(studio.read('src/platform/a.ts'), 'release\n');
  assert.equal(studio.read('README.md'), 'team\n');
  assert.deepEqual(readLock(studio.dir).platform, { version: '0.2.1', commit });
  assert.equal(studio.git('log', '-1', '--format=%s'), 'Update to Design Studio v0.2.1');
  assert.match(studio.git('show', '--name-only', '--format=', 'HEAD'), /studio\.lock\.json/);
  assert.equal(studio.git('rev-list', '--parents', '-n1', 'HEAD').split(' ').length, 3, 'a merge commit');
  assert.deepEqual(commands, ['pnpm install --no-frozen-lockfile', 'pnpm studio sync', 'pnpm check', 'pnpm build']);
  assert.equal(studio.git('status', '--porcelain'), '');
  assert.equal(planUpdate(studio.dir).upToDate, true);
});

test('failing checks are reported after the update is committed', () => {
  const { studio, release } = setup();
  release('0.2.1', { 'src/platform/a.ts': 'release\n' });
  const result = applyUpdate(studio.dir, planUpdate(studio.dir), { run: recorder({ fail: 'build' }).run });
  assert.deepEqual(result, { merged: true, checks: 'failed', failed: 'build' });
});

test('the update preserves complete seed bytes and lock records while stamping the exact selected release', () => {
  const { studio, release } = setup();
  const modules = { notes: { source: 'team-notes', files: { 'src/modules/notes/module.ts': 'hash' } } };
  const systems = { kit: { source: 'team-kit', files: { 'src/systems/kit/package.json': 'hash' } } };
  studio.commit(
    {
      'studio.lock.json': JSON.stringify({ lockfileVersion: 1, modules, systems }),
      'src/prototypes/me/p.tsx': 'mine\n',
    },
    'team content and installed records',
  );
  const original = studio.git('rev-parse', 'main');
  const commit = release('0.3.0', {
    'README.md': 'release replaces unchanged seed\n',
    'studio.lock.json': JSON.stringify({ lockfileVersion: 1, modules: {}, systems: {} }),
    'src/platform/a.ts': 'release\n',
  });
  assert.deepEqual(applyUpdate(studio.dir, planUpdate(studio.dir), { run: recorder().run }), {
    merged: true,
    checks: 'passed',
  });
  assert.equal(studio.read('README.md'), 'base\n');
  assert.deepEqual(readLock(studio.dir), {
    lockfileVersion: 1,
    platform: { version: '0.3.0', commit },
    modules,
    systems,
  });
  assert.deepEqual(JSON.parse(studio.git('show', 'HEAD:studio.lock.json')), readLock(studio.dir));
  assert.equal(studio.git('rev-parse', 'main'), original);
  assert.equal(studio.git('status', '--porcelain'), '');
});

test('a conflict stops with the merge in progress, and --continue finishes it once resolved', () => {
  const { studio, release } = setup();
  studio.commit({ 'src/platform/a.ts': 'team\n' }, 'team edits the platform');
  const original = studio.git('rev-parse', 'main');
  const commit = release('0.2.1', { 'src/platform/a.ts': 'release\n', 'src/platform/b.ts': 'release\n' });
  const plan = planUpdate(studio.dir);
  assert.deepEqual(
    plan.overlap.map(entry => entry.file),
    ['src/platform/a.ts'],
  );
  const { run, commands } = recorder();
  assert.deepEqual(applyUpdate(studio.dir, plan, { run }), { merged: false, conflicts: ['src/platform/a.ts'] });
  assert.equal(studio.git('rev-parse', 'MERGE_HEAD'), commit);
  assert.equal(studio.git('rev-parse', 'main'), original);
  assert.deepEqual(commands, []);
  assert.throws(() => continueUpdate(studio.dir, { run }), /Resolve these files/);
  studio.write({ 'src/platform/a.ts': 'both\n' });
  studio.git('add', 'src/platform/a.ts');
  assert.deepEqual(continueUpdate(studio.dir, { run }), { merged: true, version: '0.2.1', checks: 'passed' });
  assert.deepEqual(readLock(studio.dir).platform, { version: '0.2.1', commit });
  assert.equal(studio.read('src/platform/b.ts'), 'release\n');
  assert.equal(studio.git('status', '--porcelain'), '');
  assert.equal(studio.git('rev-list', '--parents', '-n1', 'HEAD').split(' ').length, 3);
});

// The installer makes a fresh repository from a release's files and records the release in studio.lock.json.
const installed = ({ lock }) => {
  const { root, upstream, release } = setup();
  const dir = path.join(root, 'installed');
  fs.mkdirSync(dir);
  const studio = repo(dir);
  studio.git('init', '-q', '-b', 'main');
  for (const [key, value] of IDENTITY) studio.git('config', key, value);
  for (const file of upstream.git('ls-files').split('\n'))
    studio.write({ [file]: fs.readFileSync(path.join(upstream.dir, file), 'utf8') });
  if (lock)
    studio.write({
      'studio.lock.json': JSON.stringify({
        lockfileVersion: 1,
        platform: { version: '0.2.0', commit: upstream.git('rev-parse', 'v0.2.0^{commit}') },
        modules: {},
        systems: {},
      }),
    });
  studio.commit({ 'README.md': 'team\n' }, 'Initial studio');
  studio.git('remote', 'add', 'upstream', upstream.dir);
  return { studio, release };
};

test('a studio with no shared history updates from the release its lock records', () => {
  const { studio, release } = installed({ lock: true });
  const commit = release('0.2.1', { 'src/platform/a.ts': 'release\n', 'README.md': 'release\n' });
  const plan = planUpdate(studio.dir);
  assert.equal(plan.baseSource, 'lock');
  assert.equal(plan.joinHistory, true);
  assert.deepEqual(
    plan.overlap.map(entry => entry.file),
    ['README.md'],
  );
  assert.deepEqual(applyUpdate(studio.dir, plan, { run: recorder().run }), { merged: true, checks: 'passed' });
  assert.equal(studio.read('src/platform/a.ts'), 'release\n');
  assert.equal(studio.read('README.md'), 'team\n');
  assert.deepEqual(readLock(studio.dir).platform, { version: '0.2.1', commit });
  assert.equal(planUpdate(studio.dir).upToDate, true);
});

test('a studio with no shared history and no recorded release is refused', () => {
  const { studio, release } = installed({ lock: false });
  release('0.2.1', { 'src/platform/a.ts': 'release\n' });
  assert.match(planUpdate(studio.dir).problems[0], /shares no history/);
});

test('an existing update branch is refused', () => {
  const { studio, release } = setup();
  release('0.2.1', { 'src/platform/a.ts': 'release\n' });
  studio.git('branch', 'studio-update/v0.2.1');
  assert.match(planUpdate(studio.dir).problems[0], /branch studio-update\/v0\.2\.1 already exists/);
});
