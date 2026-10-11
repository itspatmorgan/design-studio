// Merge an upstream revision into a studio the way an update does: generated files are regenerated instead of
// merged, seed files keep the studio's copy, and anything else that conflicts is reported for a person to resolve.
// Team files are resolved like seed files. Tiers come from the incoming revision's .studio/ownership.json (src/platform/context/ownership.md).
// A file the incoming revision no longer lists (upstream renamed or deleted it) takes its tier from the studio's own map,
// so a seed file the team edited and upstream deleted keeps the team's copy instead of stopping the update; a person
// moves what they need from it into its replacement (see "Seed files" in src/platform/context/ownership.md).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tierOf } from './ownership.js';

const resolution = (map, file) => ({ generated: '--theirs', seed: '--ours', team: '--ours' })[tierOf(map, file)];

// `beforeRegenerate()` runs after the conflicts are resolved and before regeneration, in the merged tree, for a step the
// regeneration commands need first. Pre-release studios use it to stamp format versions (upgrade-test.js).
// Returns { merged: true, changed } or { merged: false, conflicts: [paths] }, leaving the merge in progress when it fails.
// `run(command, args)` runs a command in the studio; regeneration needs pnpm.
export function mergeUpstream(
  cwd,
  ref,
  {
    message = `Update from ${ref}`,
    map,
    run = (command, args) => execFileSync(command, args, { cwd, stdio: 'inherit' }),
    beforeRegenerate = () => {},
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
  let studioTiers = tiers;
  if (!map) {
    try {
      studioTiers = JSON.parse(git('show', 'HEAD:.studio/ownership.json'));
    } catch {
      /* A studio without a map has nothing older to consult. */
    }
  }
  for (const file of conflicts) {
    const side =
      resolution(tiers, file) ?? (tierOf(tiers, file) === 'unknown' ? resolution(studioTiers, file) : undefined);
    if (!side) continue;
    // Upstream deleted a file the team edited: --ours keeps the team's copy. The team deleted a file upstream edited,
    // or upstream deleted a generated file: the side to check out has no stage, so the file stays deleted.
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
  beforeRegenerate();
  // Regenerate what was taken from upstream or merged as text.
  run('pnpm', ['install', '--no-frozen-lockfile']);
  run('pnpm', ['studio', 'sync']);
  git('add', '-A');
  git('commit', '-q', '--no-verify', '-m', message);
  return { merged: true, changed: true };
}
