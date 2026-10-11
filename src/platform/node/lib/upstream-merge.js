// Merge an upstream revision into a studio the way an update does: generated files are regenerated instead of
// merged, seed files keep the studio's copy, and anything else that conflicts is reported for a person to resolve.
// Team files are resolved like seed files. Tiers come from the incoming revision's .studio/ownership.json (src/platform/context/ownership.md).
import { execFileSync } from 'node:child_process';
import { tierOf } from './ownership.js';

const resolution = (map, file) => ({ generated: '--theirs', seed: '--ours', team: '--ours' })[tierOf(map, file)];

// Returns { merged: true, changed } or { merged: false, conflicts: [paths] }, leaving the merge in progress when it fails.
// `run(command, args)` runs a command in the studio; regeneration needs pnpm.
export function mergeUpstream(
  cwd,
  ref,
  {
    message = `Update from ${ref}`,
    map,
    run = (command, args) => execFileSync(command, args, { cwd, stdio: 'inherit' }),
  } = {},
) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  let failure = null;
  try {
    git('merge', '--no-ff', '--no-commit', ref);
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
  const conflicts = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
  const tiers = map ?? JSON.parse(git('show', 'MERGE_HEAD:.studio/ownership.json'));
  for (const file of conflicts) {
    const side = resolution(tiers, file);
    if (!side) continue;
    // A side that deleted the file has no stage to check out; keep the surviving side.
    try {
      git('checkout', side, '--', file);
    } catch {
      git('rm', '-q', '--', file);
      continue;
    }
    git('add', '--', file);
  }
  const unresolved = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
  if (unresolved.length) return { merged: false, conflicts: unresolved };
  // Regenerate what was taken from upstream or merged as text.
  run('pnpm', ['install', '--no-frozen-lockfile']);
  run('pnpm', ['studio', 'sync']);
  git('add', '-A');
  git('commit', '-q', '--no-verify', '-m', message);
  return { merged: true, changed: true };
}
