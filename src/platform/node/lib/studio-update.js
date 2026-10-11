// pnpm studio update [version]: take an upstream release into a studio on a branch of its own
// (src/platform/context/ownership.md#updating-a-studio). The CLI is src/platform/node/cli/studio-update.js.
//
// Release tags are fetched from the `upstream` remote into refs/studio/upstream-tags/, so they never collide with the
// team's own tags. The update branch `studio-update/v<version>` starts at the current HEAD, and the release merges into
// it with the update rules of upstream-merge.js; the original branch is never changed, and nothing is pushed.
//
// Updates require shared release ancestry from a full release clone. Recorded metadata never substitutes for history.
import { execFileSync } from 'node:child_process';
import semver from 'semver';
import { finishUpstreamMerge, mergeUpstream } from './upstream-merge.js';
import { readLock, recordPlatform } from './lock.js';
import { mapProblems, tierOf } from './ownership.js';

export const UPSTREAM_REMOTE = 'upstream';
export const UPSTREAM_URL = 'https://github.com/itspatmorgan/design-studio-starter.git';
export const TAG_REFS = 'refs/studio/upstream-tags';
export const BRANCH_PREFIX = 'studio-update/v';
export const branchFor = version => `${BRANCH_PREFIX}${version}`;

const gitIn = cwd => {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 }).trim();
  const tryGit = (...args) => {
    try {
      return git(...args);
    } catch {
      return null;
    }
  };
  return { git, tryGit, ok: (...args) => tryGit(...args) !== null };
};
const lines = text => (text ? text.split('\n').filter(Boolean) : []);

// What each tier does to a file both sides changed (upstream-merge.js).
export const RESOLUTION = {
  generated: 'regenerated from the release',
  seed: 'keeps your copy',
  team: 'keeps your copy',
};
const resolutionOf = tier => RESOLUTION[tier] ?? 'merged; if you both changed the same lines, you choose';

// The release tags fetched from upstream, newest first: [{ version, ref }]. Pre-releases are included only by name.
export function releaseTags(cwd) {
  const { git } = gitIn(cwd);
  return lines(git('for-each-ref', '--format=%(refname)', `${TAG_REFS}/`))
    .map(ref => ({ ref, version: semver.valid(ref.slice(TAG_REFS.length + 1).replace(/^v/, '')) }))
    .filter(tag => tag.version)
    .sort((a, b) => semver.rcompare(a.version, b.version));
}

export const fetchReleaseTags = cwd =>
  gitIn(cwd).git('fetch', '-q', '--no-tags', '--force', UPSTREAM_REMOTE, `+refs/tags/v*:${TAG_REFS}/v*`);

// Everything an update would do, without changing anything but the fetched tag refs. `problems` lists why it can't run.
export function planUpdate(cwd, requested, { fetch = true } = {}) {
  const { git, tryGit, ok } = gitIn(cwd);
  const plan = { problems: [], requested: requested ?? null };
  const stop = (problem, help) => {
    plan.problems.push(problem);
    if (help) plan.help = help;
    return plan;
  };
  if (tryGit('rev-parse', '--is-inside-work-tree') !== 'true') return stop('This folder is not a Git checkout.');
  if (ok('rev-parse', '-q', '--verify', 'MERGE_HEAD'))
    return stop(
      'A merge is in progress. Finish it (pnpm studio update --continue) or abort it (git merge --abort) first.',
    );
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' }).trimEnd();
  if (dirty) stop(`Commit or stash your changes first; the working tree has:\n${dirty}`);
  if (!ok('remote', 'get-url', UPSTREAM_REMOTE))
    return stop(`This studio has no "${UPSTREAM_REMOTE}" remote to take releases from.`, [
      `git remote add ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`,
    ]);
  if (fetch) {
    try {
      fetchReleaseTags(cwd);
    } catch (error) {
      return stop(
        `Could not fetch release tags from ${UPSTREAM_REMOTE}: ${String(error.stderr ?? error.message).trim()}`,
      );
    }
  }
  const tags = releaseTags(cwd);
  const wanted =
    requested === undefined || requested === null ? null : semver.valid(String(requested).replace(/^v/, ''));
  if (requested && !wanted) return stop(`${JSON.stringify(requested)} is not a version like 0.2.1.`);
  const target = wanted ? tags.find(tag => tag.version === wanted) : tags.find(tag => !semver.prerelease(tag.version));
  if (!target)
    return stop(
      wanted
        ? `${UPSTREAM_REMOTE} has no release v${wanted}.${tags.length ? ` Releases: ${tags.map(t => `v${t.version}`).join(', ')}.` : ''}`
        : `${UPSTREAM_REMOTE} has no release tags yet.`,
    );
  Object.assign(plan, {
    version: target.version,
    tag: `v${target.version}`,
    commit: git('rev-parse', `${target.ref}^{commit}`),
    head: git('rev-parse', 'HEAD'),
    originalBranch: tryGit('symbolic-ref', '--quiet', '--short', 'HEAD'),
    branch: branchFor(target.version),
  });
  const lock = readLock(cwd).platform;
  const lockCommit = lock && ok('cat-file', '-e', `${lock.commit}^{commit}`) ? lock.commit : null;
  plan.installed = lock ? { ...lock, known: Boolean(lockCommit) } : null;
  // Already there only when the studio contains the release in its history.
  plan.upToDate = ok('merge-base', '--is-ancestor', plan.commit, 'HEAD');
  if (plan.upToDate) return plan;
  const mergeBase = tryGit('merge-base', 'HEAD', plan.commit);
  if (!mergeBase)
    return stop(
      `This studio shares no release history with ${UPSTREAM_REMOTE}. Updates require a full release clone. Preserve this studio and transfer its owned work into an isolated release clone before retrying.`,
    );
  Object.assign(plan, { base: mergeBase });
  if (ok('rev-parse', '-q', '--verify', `refs/heads/${plan.branch}`))
    stop(`The branch ${plan.branch} already exists. Finish or delete it first (git branch -D ${plan.branch}).`);
  const diff = (from, to) =>
    execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', from, to], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    })
      .split('\0')
      .filter(Boolean);
  plan.commits = Number(git('rev-list', '--count', `${plan.base}..${plan.commit}`));
  plan.upstreamChanged = diff(plan.base, plan.commit);
  const teamChanged = new Set(diff(plan.base, 'HEAD'));
  let map, previous;
  try {
    map = JSON.parse(git('show', `${plan.commit}:.studio/ownership.json`));
    previous = JSON.parse(git('show', 'HEAD:.studio/ownership.json'));
    const invalid = [...mapProblems(map), ...mapProblems(previous)];
    if (invalid.length) return stop(`Cannot plan preservation with invalid ownership rules: ${invalid.join(' ')}`);
  } catch {
    return stop(
      'Both this studio and the selected release need valid .studio/ownership.json rules before an update can preserve work.',
    );
  }
  plan.overlap = plan.upstreamChanged
    .filter(file => teamChanged.has(file))
    .map(file => {
      const oldTier = tierOf(previous, file);
      const tier = ['seed', 'team', 'unknown'].includes(oldTier)
        ? oldTier === 'unknown'
          ? 'team'
          : oldTier
        : tierOf(map, file);
      const name = typeof tier === 'string' ? tier : 'conflicting';
      return { file, tier: name, resolution: resolutionOf(name) };
    });
  return plan;
}

const recordStep = (cwd, plan) => () => recordPlatform(cwd, { version: plan.version, commit: plan.commit });
const verify = (run, log) => {
  for (const script of ['check', 'build']) {
    log(`Run pnpm ${script}.`);
    try {
      run('pnpm', [script]);
    } catch {
      return { checks: 'failed', failed: script };
    }
  }
  return { checks: 'passed' };
};

// Creates the update branch and merges the release into it. Returns { merged: true, checks, failed? } or
// { merged: false, conflicts } with the merge left in progress on the update branch.
export function applyUpdate(cwd, plan, { run, log = () => {} }) {
  const { git } = gitIn(cwd);
  log(`Create the branch ${plan.branch} from ${plan.originalBranch ?? plan.head.slice(0, 7)}.`);
  git('switch', '-q', '-c', plan.branch);
  log(`Merge Design Studio ${plan.tag}.`);
  const result = mergeUpstream(cwd, plan.commit, {
    message: `Update to Design Studio ${plan.tag}`,
    run,
    beforeRegenerate: recordStep(cwd, plan),
  });
  if (!result.merged) return { merged: false, conflicts: result.conflicts };
  return { merged: true, ...verify(run, log) };
}

// After a person resolves the conflicts of an update: regenerate, record the release, commit, and verify.
export function continueUpdate(cwd, { run, log = () => {} }) {
  const { git, tryGit } = gitIn(cwd);
  const branch = tryGit('symbolic-ref', '--quiet', '--short', 'HEAD') ?? '';
  const version = branch.startsWith(BRANCH_PREFIX) ? semver.valid(branch.slice(BRANCH_PREFIX.length)) : null;
  const commit = tryGit('rev-parse', '-q', '--verify', 'MERGE_HEAD');
  if (!version || !commit)
    throw new Error(
      `There is no update in progress here. It continues on a ${BRANCH_PREFIX}<version> branch with a merge in progress.`,
    );
  const unresolved = lines(git('diff', '--name-only', '--diff-filter=U'));
  if (unresolved.length)
    throw new Error(`Resolve these files and git add each one first:\n${unresolved.map(f => `  ${f}`).join('\n')}`);
  const plan = { version, commit, tag: `v${version}` };
  log(`Finish the merge of Design Studio ${plan.tag}.`);
  finishUpstreamMerge(cwd, {
    message: `Update to Design Studio ${plan.tag}`,
    run,
    beforeRegenerate: recordStep(cwd, plan),
  });
  return { merged: true, version, ...verify(run, log) };
}
