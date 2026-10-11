import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  applyRelease,
  releasedChangelog,
  releasePlan,
  unreleasedNotes,
  CHANGELOG_FILE,
  CONTRACT_FILE,
  VERSION_FILE,
} from './release.js';

const CHANGELOG = '# Changelog\n\n## Unreleased\n\n- A change.\n\n## 0.1.0 (2026-01-01)\n\n- Older.\n';

// A clone of a bare "origin" with only the files a release touches, on main.
function checkout({ version = '0.2.0', changelog = CHANGELOG } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
  const origin = path.join(dir, 'origin.git');
  const work = path.join(dir, 'work');
  const git = (...args) => execFileSync('git', args, { cwd: work, encoding: 'utf8' }).trim();
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  execFileSync('git', ['clone', '-q', origin, work], { stdio: 'ignore' });
  for (const [key, value] of [
    ['user.name', 'Test'],
    ['user.email', 'test@example.test'],
    ['commit.gpgsign', 'false'],
    ['tag.gpgsign', 'false'],
  ])
    git('config', key, value);
  git('checkout', '-q', '-B', 'main');
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
    fs.writeFileSync(path.join(work, file), text);
  };
  write(VERSION_FILE, `// version\nexport const PLATFORM_VERSION = '${version}';\n`);
  write(CONTRACT_FILE, JSON.stringify({ platformVersion: version }) + '\n');
  write(CHANGELOG_FILE, changelog);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('push', '-q', 'origin', 'main');
  return { dir: work, git, write, read: file => fs.readFileSync(path.join(work, file), 'utf8') };
}

// Stands in for the pnpm scripts: contract --update copies the version into the snapshot.
const scripts = (dir, { fail } = {}) => {
  const ran = [];
  const run = (command, args) => {
    ran.push([command, ...args].join(' '));
    if (fail && args[0] === fail) throw new Error(`pnpm ${fail} failed`);
    if (args.join(' ') === 'contract --update') {
      const version = fs.readFileSync(path.join(dir, VERSION_FILE), 'utf8').match(/'([^']+)'/)[1];
      fs.writeFileSync(path.join(dir, CONTRACT_FILE), JSON.stringify({ platformVersion: version }) + '\n');
    }
  };
  return { run, ran };
};

test('the Unreleased section is dated and a fresh one starts above it', () => {
  assert.equal(unreleasedNotes(CHANGELOG), '- A change.');
  const next = releasedChangelog(CHANGELOG, '0.2.1', '2026-10-11');
  assert.match(next, /^# Changelog\n\n## Unreleased\n\n## 0\.2\.1 \(2026-10-11\)\n\n- A change\.\n\n## 0\.1\.0/);
  assert.equal(unreleasedNotes(next), '');
});

test('a dry run plans the release and changes nothing', () => {
  const { dir, git } = checkout();
  const before = git('rev-parse', 'HEAD');
  const plan = releasePlan(dir, '0.2.1', { today: '2026-10-11' });
  assert.deepEqual(plan.problems, []);
  assert.equal(plan.tag, 'v0.2.1');
  assert.equal(plan.current, '0.2.0');
  assert.equal(git('rev-parse', 'HEAD'), before);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal(git('tag'), '');
});

test('the current version can be released, so the first release needs no bump', () => {
  const { dir, git, read } = checkout();
  const plan = releasePlan(dir, 'v0.2.0', { today: '2026-10-11' });
  assert.deepEqual(plan.problems, []);
  const { run, ran } = scripts(dir);
  const result = applyRelease(dir, plan, { run, log: () => {} });
  assert.deepEqual(ran, ['pnpm contract --update', 'pnpm check', 'pnpm contract --released', 'pnpm build']);
  assert.equal(result.tag, 'v0.2.0');
  assert.equal(git('log', '-1', '--format=%s'), 'Release v0.2.0');
  assert.equal(git('cat-file', '-t', 'v0.2.0'), 'tag', 'annotated');
  assert.equal(git('rev-parse', 'v0.2.0^{commit}'), result.commit);
  assert.match(git('tag', '-l', '--format=%(contents)', 'v0.2.0'), /- A change\./);
  assert.match(read(CHANGELOG_FILE), /## Unreleased\n\n## 0\.2\.0 \(2026-10-11\)\n\n- A change\./);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal(git('ls-remote', '--tags', 'origin'), '', 'nothing is pushed');
});

test('a newer version sets PLATFORM_VERSION and the contract snapshot', () => {
  const { dir, read } = checkout();
  const plan = releasePlan(dir, '0.3.0', { today: '2026-10-11' });
  applyRelease(dir, plan, { run: scripts(dir).run, log: () => {} });
  assert.match(read(VERSION_FILE), /PLATFORM_VERSION = '0\.3\.0'/);
  assert.match(read(CONTRACT_FILE), /"platformVersion":"0\.3\.0"/);
});

test('a lower version, a bad version, or an existing tag is refused', () => {
  const { dir, git } = checkout();
  assert.match(releasePlan(dir, '0.1.9').problems.join('\n'), /lower than the current PLATFORM_VERSION 0\.2\.0/);
  assert.match(releasePlan(dir, 'next').problems.join('\n'), /not a semver version/);
  git('tag', 'v0.2.1');
  assert.match(releasePlan(dir, '0.2.1').problems.join('\n'), /tag v0\.2\.1 already exists/);
});

test('a dirty tree, another branch, an out-of-date main, or empty notes is refused', () => {
  const { dir, git, write } = checkout();
  write('notes.txt', 'draft\n');
  assert.match(releasePlan(dir, '0.2.1').problems.join('\n'), /uncommitted changes/);
  fs.rmSync(path.join(dir, 'notes.txt'));
  git('checkout', '-q', '-b', 'topic');
  assert.match(releasePlan(dir, '0.2.1').problems.join('\n'), /Release from main; this checkout is on topic/);
  git('checkout', '-q', 'main');
  write('later.txt', 'later\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'local only');
  assert.match(releasePlan(dir, '0.2.1').problems.join('\n'), /not the same commit as origin\/main/);
  const empty = checkout({ changelog: '# Changelog\n\n## Unreleased\n\n## 0.1.0 (2026-01-01)\n' });
  assert.match(releasePlan(empty.dir, '0.2.1').problems.join('\n'), /nothing under "## Unreleased"/);
});

test('a failing check restores the files and makes no commit or tag', () => {
  const { dir, git } = checkout();
  const before = git('rev-parse', 'HEAD');
  const plan = releasePlan(dir, '0.2.1', { today: '2026-10-11' });
  assert.throws(
    () => applyRelease(dir, plan, { run: scripts(dir, { fail: 'build' }).run, log: () => {} }),
    /build failed/,
  );
  assert.equal(git('rev-parse', 'HEAD'), before);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal(git('tag'), '');
});
