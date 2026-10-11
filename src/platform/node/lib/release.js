// Cut a platform release (src/platform/context/releasing.md): set PLATFORM_VERSION, refresh the contract snapshot,
// date the CHANGELOG's Unreleased section, run the checks, commit "Release v<version>" and tag v<version> locally.
// It never pushes; the maintainer pushes the commit and the tag. The CLI is src/platform/node/cli/release.js.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';

export const VERSION_FILE = 'src/platform/core/modules/index.ts';
export const CHANGELOG_FILE = 'CHANGELOG.md';
export const CONTRACT_FILE = 'src/platform/core/contract.snapshot.json';
export const UNRELEASED = '## Unreleased';
export const RELEASE_BRANCH = 'main';
const VERSION_LINE = /^export const PLATFORM_VERSION = '([^']+)';$/m;

export const platformVersionOf = text => text.match(VERSION_LINE)?.[1];
export const withPlatformVersion = (text, version) =>
  text.replace(VERSION_LINE, `export const PLATFORM_VERSION = '${version}';`);

// The lines under `## Unreleased`, up to the next `## ` heading, without surrounding blank lines.
export function unreleasedNotes(changelog) {
  const lines = changelog.split('\n');
  const start = lines.indexOf(UNRELEASED);
  if (start < 0) return null;
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines
    .slice(start + 1, end < 0 ? lines.length : end)
    .join('\n')
    .trim();
}

// `## Unreleased` becomes `## <version> (<date>)`, and a fresh empty Unreleased section starts above it.
export const releasedChangelog = (changelog, version, date) =>
  changelog.replace(new RegExp(`^${UNRELEASED}$`, 'm'), `${UNRELEASED}\n\n## ${version} (${date})`);

const localDate = (now = new Date()) =>
  [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(n => String(n).padStart(2, '0')).join('-');

// What the release would do, and why it can't, without changing anything.
export function releasePlan(cwd, input, { today = localDate() } = {}) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const tryGit = (...args) => {
    try {
      return git(...args);
    } catch {
      return null;
    }
  };
  const problems = [];
  const version = semver.valid(String(input ?? '').replace(/^v/, ''));
  const current = platformVersionOf(fs.readFileSync(path.join(cwd, VERSION_FILE), 'utf8'));
  if (!version) problems.push(`${JSON.stringify(input ?? '')} is not a semver version like 0.2.1.`);
  else if (!current) problems.push(`${VERSION_FILE} has no PLATFORM_VERSION line.`);
  else if (semver.lt(version, current))
    problems.push(`${version} is lower than the current PLATFORM_VERSION ${current}. A release can't go backwards.`);
  const tag = version ? `v${version}` : null;
  const branch = tryGit('symbolic-ref', '--quiet', '--short', 'HEAD');
  if (branch !== RELEASE_BRANCH)
    problems.push(`Release from ${RELEASE_BRANCH}; this checkout is on ${branch ?? 'a detached HEAD'}.`);
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' }).trimEnd();
  if (dirty) problems.push(`The working tree has uncommitted changes:\n${dirty}`);
  if (tag && tryGit('rev-parse', '-q', '--verify', `refs/tags/${tag}`)) problems.push(`The tag ${tag} already exists.`);
  // Up to date with origin, when there is one: a release is cut from the commit everyone sees.
  let upstream = null;
  if (tryGit('remote', 'get-url', 'origin') !== null) {
    if (tryGit('fetch', '-q', '--no-tags', 'origin', RELEASE_BRANCH) === null)
      problems.push(`Could not fetch ${RELEASE_BRANCH} from origin.`);
    else {
      upstream = `origin/${RELEASE_BRANCH}`;
      const [head, remote] = [git('rev-parse', 'HEAD'), git('rev-parse', 'FETCH_HEAD')];
      if (head !== remote)
        problems.push(`This ${RELEASE_BRANCH} is not the same commit as origin/${RELEASE_BRANCH}; pull or push first.`);
      if (tag && tryGit('ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`) !== null)
        problems.push(`origin already has the tag ${tag}.`);
    }
  }
  const changelog = fs.readFileSync(path.join(cwd, CHANGELOG_FILE), 'utf8');
  const notes = unreleasedNotes(changelog);
  if (notes === null) problems.push(`${CHANGELOG_FILE} has no "${UNRELEASED}" section.`);
  else if (!notes) problems.push(`${CHANGELOG_FILE} has nothing under "${UNRELEASED}". Describe the release first.`);
  return { version, current, tag, date: today, notes, upstream, problems };
}

// Applies a plan. `run(command, args)` runs a command in the checkout and throws when it fails. Files are restored if
// a step fails before the commit, so a failed release leaves main as it was.
export function applyRelease(cwd, plan, { run, log = console.log }) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const files = [VERSION_FILE, CHANGELOG_FILE, CONTRACT_FILE];
  const edit = (file, change) => {
    const target = path.join(cwd, file);
    fs.writeFileSync(target, change(fs.readFileSync(target, 'utf8')));
  };
  try {
    log(`Set PLATFORM_VERSION to ${plan.version}.`);
    edit(VERSION_FILE, text => withPlatformVersion(text, plan.version));
    log('Update the contract snapshot.');
    run('pnpm', ['contract', '--update']);
    log(`Date the changelog: ## ${plan.version} (${plan.date}).`);
    edit(CHANGELOG_FILE, text => releasedChangelog(text, plan.version, plan.date));
    for (const script of ['check', 'contract', 'build']) {
      log(`Run pnpm ${script}.`);
      run('pnpm', script === 'contract' ? [script, '--released'] : [script]);
    }
    const stray = execFileSync('git', ['status', '--porcelain', '-z', '--untracked-files=all'], {
      cwd,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean)
      .map(entry => entry.slice(3))
      .filter(file => !files.includes(file));
    if (stray.length) throw new Error(`The checks changed files the release does not own:\n${stray.join('\n')}`);
  } catch (error) {
    git('checkout', '--', ...files);
    throw error;
  }
  git('add', '--', ...files);
  git('commit', '-q', '--no-verify', '-m', `Release ${plan.tag}`);
  git('tag', '-a', plan.tag, '-m', `Design Studio ${plan.tag}\n\n${plan.notes}`);
  return { commit: git('rev-parse', 'HEAD'), tag: plan.tag };
}

export const pushCommand = plan => `git push --atomic origin ${RELEASE_BRANCH} ${plan.tag}`;
