// Merge an upstream revision into a studio the way an update does: generated files are regenerated instead of
// merged, seed files keep the studio's copy, and anything else that conflicts is reported for a person to resolve.
// Tiers follow src/platform/context/ownership.md.
import { execFileSync } from 'node:child_process';
import { matches } from '../check/test-selection.js';

export const GENERATED = ['pnpm-lock.yaml', '.agents/skills/**', '.agents/studio-skills.json', '.claude/skills/**'];
export const SEED = ['README.md', 'studio.config.ts', 'contributors/patrick.json', 'src/prototypes/patrick/**', 'src/systems/product/**', 'src/systems/marketing/**'];

const tier = file => GENERATED.some(glob => matches(file, glob)) ? 'generated' : SEED.some(glob => matches(file, glob)) ? 'seed' : 'other';

// Returns { merged: true, changed } or { merged: false, conflicts: [paths] }, leaving the merge in progress when it fails.
// `run(command, args)` runs a command in the studio; regeneration needs pnpm.
export function mergeUpstream(cwd, ref, { message = `Update from ${ref}`, run = (command, args) => execFileSync(command, args, { cwd, stdio: 'inherit' }) } = {}) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  let failure = null;
  try { git('merge', '--no-ff', '--no-commit', ref); } catch (error) { failure = error; }
  // No merge in progress: either the ref was already merged, or git refused before merging (a dirty tree).
  try { git('rev-parse', '-q', '--verify', 'MERGE_HEAD'); } catch {
    if (failure) throw failure;
    return { merged: true, changed: false };
  }
  const conflicts = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
  for (const file of conflicts) {
    const kind = tier(file);
    if (kind === 'other') continue;
    // A side that deleted the file has no stage to check out; keep the surviving side.
    try { git('checkout', kind === 'generated' ? '--theirs' : '--ours', '--', file); } catch { git('rm', '-q', '--', file); continue; }
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
