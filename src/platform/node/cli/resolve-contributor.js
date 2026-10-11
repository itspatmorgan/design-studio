import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import fs from 'node:fs';
import { readDeclaration } from '../../core/declarations.ts';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
import { loadContributors } from '../lib/contributors.js';

export { loadContributors };

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/** Key for a GitHub username (used by CI with GITHUB_ACTOR). */
export function keyForGithub(login, contributors = loadContributors()) {
  if (!login) return null;
  const l = login.toLowerCase();
  const matches = Object.keys(contributors).filter(key => contributors[key].github?.toLowerCase() === l);
  return matches.length === 1 ? matches[0] : null;
}

/** Current contributor's key: Git email first, with unambiguous legacy identity fallbacks. */
export function resolveContributor() {
  const contributors = loadContributors();
  const email = run('git', ['config', 'user.email']).toLowerCase();
  const byEmail = Object.keys(contributors).filter(key => email && contributors[key].email?.toLowerCase() === email);
  if (byEmail.length === 1) return byEmail[0];
  if (byEmail.length > 1) return null;
  const name = run('git', ['config', 'user.name']).toLowerCase();
  const matches = Object.keys(contributors).filter(key => name && contributors[key].name?.toLowerCase() === name);
  // Profiles with an explicitly unavailable email can resolve through an unambiguous Git name.
  if (matches.length === 1 && !contributors[matches[0]].email) return matches[0];
  // A configured, unregistered identity must not inherit a different global GitHub account.
  if (email) return null;
  const declaration = readDeclaration(fs.readFileSync(path.join(ROOT, 'studio.config.ts'), 'utf8'));
  if ('error' in declaration) throw new Error(declaration.error);
  const byGh =
    declaration.value.usage === 'personal'
      ? null
      : keyForGithub(run('gh', ['api', 'user', '--jq', '.login']), contributors);
  if (byGh) return byGh;
  if (!name) return null;
  return matches.length === 1 ? matches[0] : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const key = resolveContributor();
  if (!key) {
    console.error('Not a contributor yet. Run `pnpm join` to add yourself.');
    process.exit(1);
  }
  console.log(key);
}
