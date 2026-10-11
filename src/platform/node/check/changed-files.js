// The files a hook or CI run should check, shared by check-scope.js and check-asset-size.js.
//   --staged                 files staged for the next commit
//   --push                   files in commits not yet on the remote
//   --ci <before> <after>    files in a pushed range (only the latest commit on a branch's first push)
// filter: a git --diff-filter, like 'AM' for added or modified files only.
// Returns { files, baseRef }: baseRef is the "before" side, or null if there isn't one.
import { execFileSync } from 'node:child_process';

export const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const lines = s => s.split('\n').filter(Boolean);
const ZERO = /^0+$/;

export function changedFiles(mode, before, after, { filter } = {}) {
  const f = filter ? [`--diff-filter=${filter}`] : [];
  if (mode === '--staged') return { files: lines(git('diff', '--cached', '--name-only', ...f)), baseRef: 'HEAD' };
  if (mode === '--push') {
    let upstream = null;
    try {
      upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
    } catch {
      /* no upstream yet */
    }
    // No upstream yet: everything not on any remote.
    const files = upstream
      ? lines(git('diff', '--name-only', ...f, `${upstream}..HEAD`))
      : lines(git('log', '--name-only', '--pretty=format:', ...f, 'HEAD', '--not', '--remotes'));
    return { files: [...new Set(files)], baseRef: upstream };
  }
  if (mode === '--ci') {
    if (!after) throw new Error('--ci needs <before> <after>');
    if (!before || ZERO.test(before)) {
      // First push of a branch: check only the latest commit.
      let baseline = 'empty-tree';
      try {
        baseline = git('rev-parse', '--verify', `${after}^`);
      } catch {
        /* Initial repository commit has no before-side authority. */
      }
      return {
        files: lines(git('diff-tree', '--no-commit-id', '--name-only', '-r', '--root', ...f, after)),
        baseRef: baseline,
      };
    }
    return { files: lines(git('diff', '--name-only', ...f, `${before}..${after}`)), baseRef: before };
  }
  return null;
}
