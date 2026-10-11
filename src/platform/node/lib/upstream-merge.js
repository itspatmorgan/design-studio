// Apply ownership to the entire merge tree, including clean Git merges (context/ownership.md).
// Existing seed/team paths and their deletions stay with the studio even if the incoming map changes their tier.
// New seed paths take the release copy; generated paths take the release before regeneration.
// Upstream and mixed paths use Git's merge and leave conflicts for review.
import { execFileSync } from 'node:child_process';
import { mapProblems, tierOf } from './ownership.js';

const protectedTier = tier => ['seed', 'team', 'unknown'].includes(tier);
const records = text => text.split('\0').filter(Boolean);
const entry = record => [record.slice(0, record.indexOf('\t')), record.slice(record.indexOf('\t') + 1)];
const treeEntries = text =>
  new Map(
    records(text).map(record => {
      const [metadata, file] = entry(record);
      const [mode, , hash] = metadata.split(' ');
      return [file, `${mode} ${hash}`];
    }),
  );

// `beforeRegenerate()` runs after the conflicts are resolved and before regeneration, in the merged tree, for a step the
// regeneration commands need first, such as recording the selected release in studio.lock.json.
// Returns { merged: true, changed } or { merged: false, conflicts: [paths] }, leaving the merge in progress when it fails.
// `run(command, args)` runs a command in the studio; regeneration needs pnpm.
export function mergeUpstream(
  cwd,
  ref,
  {
    message = `Update from ${ref}`,
    run = (command, args) => execFileSync(command, args, { cwd, stdio: 'inherit' }),
    beforeRegenerate = () => {},
  } = {},
) {
  const git = (...args) =>
    execFileSync('git', ['--literal-pathspecs', ...args], { cwd, encoding: 'utf8', maxBuffer: 1 << 28 }).trimEnd();
  const ownership = revision => {
    const map = JSON.parse(git('show', `${revision}:.studio/ownership.json`));
    const problems = mapProblems(map);
    if (problems.length) throw new Error(`Invalid ownership map in ${revision}: ${problems.join(' ')}`);
    return map;
  };
  const incoming = git('rev-parse', `${ref}^{commit}`);
  const studioTiers = ownership('HEAD');
  const tiers = ownership(incoming);
  const tree = revision => treeEntries(git('ls-tree', '-r', '-z', revision));
  const ours = tree('HEAD');
  const theirs = tree(incoming);
  const base = tree(git('merge-base', 'HEAD', incoming));
  let failure = null;
  try {
    git('merge', '--no-ff', '--no-commit', incoming);
  } catch (error) {
    failure = error;
  }
  // No merge in progress: either the ref was already merged, or git refused before merging (a dirty tree).
  try {
    git('rev-parse', '-q', '--verify', 'MERGE_HEAD');
  } catch {
    if (failure) throw failure;
    return { merged: true, changed: false };
  }
  const index = new Map();
  const conflicts = new Set();
  for (const record of records(git('ls-files', '--stage', '-z'))) {
    const [metadata, file] = entry(record);
    const [mode, hash, stage] = metadata.split(' ');
    if (stage === '0') index.set(file, `${mode} ${hash}`);
    else conflicts.add(file);
  }
  for (const file of new Set([...base.keys(), ...ours.keys(), ...theirs.keys(), ...index.keys(), ...conflicts])) {
    const previous = tierOf(studioTiers, file);
    const declared = tierOf(tiers, file);
    if (previous?.conflict || declared?.conflict) throw new Error(`Conflicting ownership rules for ${file}.`);
    const tier = declared === 'unknown' ? previous : declared;
    let source;
    if ((ours.has(file) || base.has(file)) && protectedTier(previous)) source = 'HEAD';
    else if (tier === 'seed') source = ours.has(file) || base.has(file) ? 'HEAD' : incoming;
    else if (protectedTier(tier)) source = 'HEAD';
    else if (tier === 'generated') {
      // Sync owns adapter replacement/removal using the studio receipt. Taking release adapters first would
      // overwrite user modifications or turn generated team-module adapters into unrecognized collisions.
      const adapters =
        file === '.agents/studio-skills.json' ||
        file.startsWith('.agents/skills/') ||
        file.startsWith('.claude/skills/');
      source = adapters ? 'HEAD' : incoming;
    } else continue;
    const expected = (source === 'HEAD' ? ours : theirs).get(file);
    if (!conflicts.has(file) && index.get(file) === expected) continue;
    if (expected) git('restore', `--source=${source}`, '--staged', '--worktree', '--', file);
    else git('rm', '-q', '-f', '--ignore-unmatch', '--', file);
  }
  const unresolved = records(git('diff', '-z', '--name-only', '--diff-filter=U'));
  if (unresolved.length) return { merged: false, conflicts: unresolved };
  finishUpstreamMerge(cwd, { message, run, beforeRegenerate });
  return { merged: true, changed: true };
}

// Completes a merge whose conflicts are all resolved: runs `beforeRegenerate()`, regenerates what was taken from
// upstream or merged as text, and commits. `pnpm studio update --continue` calls it after a person resolves conflicts.
export function finishUpstreamMerge(
  cwd,
  {
    message,
    run = (command, args) => execFileSync(command, args, { cwd, stdio: 'inherit' }),
    beforeRegenerate = () => {},
  },
) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  beforeRegenerate();
  run('pnpm', ['install', '--no-frozen-lockfile']);
  run('pnpm', ['studio', 'sync']);
  git('add', '-A');
  git('commit', '-q', '--no-verify', '-m', message);
}
