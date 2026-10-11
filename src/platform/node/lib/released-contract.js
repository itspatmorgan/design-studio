// Public compatibility starts at the launch release. Historical pre-release snapshots are not read or supported.
import { execFileSync } from 'node:child_process';
import semver from 'semver';
import { FIRST_PUBLIC_RELEASE, SNAPSHOT_FILE, SNAPSHOT_VERSION, contractChanges } from './contract.js';

const git = (root, ...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

export function releasedBaseline(root, candidateVersion) {
  const head = git(root, 'rev-parse', 'HEAD');
  const clean = !git(root, 'status', '--porcelain');
  const tags = git(root, 'tag', '--list', 'v*')
    .split('\n')
    .filter(tag => {
      const version = semver.valid(tag.slice(1));
      return version && !semver.prerelease(version) && semver.gte(version, FIRST_PUBLIC_RELEASE);
    })
    .sort((a, b) => semver.rcompare(a.slice(1), b.slice(1)));
  // A candidate's own tag cannot authorize its changes against the preceding release.
  const tag = tags.find(
    tag =>
      !(
        clean &&
        (!candidateVersion || tag.slice(1) === candidateVersion) &&
        git(root, 'rev-parse', `${tag}^{commit}`) === head
      ),
  );
  if (!tag) return null;
  const snapshot = JSON.parse(git(root, 'show', `${tag}:${SNAPSHOT_FILE}`));
  if (snapshot.snapshotVersion !== SNAPSHOT_VERSION || snapshot.platformVersion !== tag.slice(1))
    throw new Error(`${tag} has an invalid public contract snapshot. Restore the supported release history and tags.`);
  return { tag, snapshot };
}

export function releasedProblems(current, baseline) {
  if (!baseline)
    return current.platformVersion === FIRST_PUBLIC_RELEASE
      ? []
      : [
          `No preceding supported public release (v${FIRST_PUBLIC_RELEASE} or newer) was found. Fetch complete upstream history and release tags before verifying a later release.`,
        ];
  const previous = baseline.snapshot;
  if (semver.lt(current.platformVersion, previous.platformVersion))
    return [`PLATFORM_VERSION ${current.platformVersion} is older than supported release ${baseline.tag}.`];
  const changes = contractChanges(current, previous);
  const minorRaised =
    semver.major(current.platformVersion) > semver.major(previous.platformVersion) ||
    semver.minor(current.platformVersion) > semver.minor(previous.platformVersion);
  if (changes.stable.length && !minorRaised)
    return [
      `Stable contract changes against ${baseline.tag} require a minor version increase under the 0.x policy; ${current.platformVersion} does not authorize them:\n${changes.stable.map(line => `  ${line}`).join('\n')}`,
    ];
  return [];
}

export function reviewChanges(root, current, ref) {
  const previous = JSON.parse(git(root, 'show', `${ref}:${SNAPSHOT_FILE}`));
  const changed = contractChanges(current, previous);
  return [...changed.stable, ...changed.experimental];
}
