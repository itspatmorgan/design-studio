// Usage: node scripts/check/check-identity.js   (pre-commit, never blocks)
//
// Warns when your Git name or email doesn't match your contributor profile, so every
// commit traces back to the right person. Fix it with:
//   git config user.name "Your Name"
//   git config user.email you@yourcompany.com
import { execFileSync } from 'node:child_process';
import { loadContributors, resolveContributor } from '../cli/resolve-contributor.js';

const git = key => {
  try {
    return execFileSync('git', ['config', key], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const key = resolveContributor();
const entry = key && loadContributors()[key];
if (entry) {
  const name = git('user.name');
  const email = git('user.email');
  const problems = [];
  if (entry.name && name !== entry.name)
    problems.push(`user.name is "${name}", but your contributor profile says "${entry.name}"`);
  if (entry.email && email.toLowerCase() !== entry.email.toLowerCase())
    problems.push(`user.email is "${email}", but your contributor profile says "${entry.email}"`);
  if (problems.length) {
    console.log(`Identity check (${key}): your Git identity doesn't match your contributor profile.`);
    for (const p of problems) console.log(`  ${p}`);
    console.log(
      '  Set it with git config user.name / user.email, then amend this commit (git commit --amend --reset-author).',
    );
  }
}
