import { retainedResourceIds, allocateResourceIdentity } from '../lib/resource-identity-lifecycle.js';
import { INSTALLED_FILE_TYPES } from '../lib/file-types.js';
// Usage:
//   pnpm join                          (dry run: prints the entry it would add)
//   pnpm join --yes                    (adds it as contributors/<key>.json)
//   pnpm join --key sam --name "Sam Lee" --github samlee --email sam@yourcompany.com --yes
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveContributor, loadContributors } from './resolve-contributor.js';
import { SECTION_KEYS } from '../lib/modules.js';
import { CONFIG } from '../lib/modules.js';
import { contributorFile } from '../lib/contributors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// Keys that are app page URLs, so they can't be contributor folders (/systems, /documentation, /examples): the modules' sections.
const RESERVED = SECTION_KEYS;
const PERSONAL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|mac|aol|proton|protonmail|hey)\./i;

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// --key value, --name value, ... and --yes
const args = process.argv.slice(2).filter(a => a !== '--');
const flag = name => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1].trim() : null;
};
const yes = args.includes('--yes');

if (RESERVED.has(flag('key'))) {
  console.error(`Key "${flag('key')}" is reserved (it's an app page URL, /${flag('key')}). Pass a different --key.`);
  process.exit(1);
}

const explicit = ['key', 'name', 'email', 'github'].some(key => flag(key) !== null);
const existing = explicit ? null : resolveContributor();
if (existing) {
  if (yes) ensureFolder(existing);
  console.log(`You're already a contributor: "${existing}". Your folder is src/prototypes/${existing}/.`);
  const entryName = loadContributors()[existing]?.name;
  const gitName = run('git', ['config', 'user.name']);
  if (entryName && gitName && entryName !== gitName)
    console.log(
      `Warning: that entry is for ${entryName}, but your Git name is ${gitName}. If that's not you, your GitHub account is shared with their entry.`,
    );
  process.exit(0);
}

const contributors = loadContributors();
const name = flag('name') ?? run('git', ['config', 'user.name']);
const email = flag('email') ?? run('git', ['config', 'user.email']);
const github =
  flag('github') ?? (CONFIG.usage === 'personal' || explicit ? '' : run('gh', ['api', 'user', '--jq', '.login']));

// Key: lowercase first name, with a number added if it's taken.
let key = flag('key');
if (!key) {
  const base = (name.split(/\s+/)[0] ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '');
  key = base;
  for (let n = 2; key && (contributors[key] || RESERVED.has(key)); n++) key = `${base}${n}`;
}

const problems = [];
if (!key) problems.push('No key. Pass --key, or set your Git name (git config user.name).');
else if (!/^[a-z0-9][a-z0-9-]*$/.test(key))
  problems.push(`Key "${key}" should be lowercase letters, numbers, and dashes.`);
else if (RESERVED.has(key))
  problems.push(`Key "${key}" is reserved (it's an app page URL, /${key}). Pass a different --key.`);
else if (contributors[key]) {
  const prior = contributors[key];
  if (
    prior.name === name &&
    prior.email?.toLowerCase() === email.toLowerCase() &&
    (prior.github ?? '').toLowerCase() === github.toLowerCase()
  ) {
    if (yes) ensureFolder(key);
    console.log(`You're already a contributor: "${key}". Your folder is src/prototypes/${key}/.`);
    process.exit(0);
  }
  problems.push(`Key "${key}" is already taken. Pass a different --key.`);
}
for (const [other, entry] of Object.entries(contributors)) {
  if (email && entry.email?.toLowerCase() === email.toLowerCase())
    problems.push(`Email is already registered to ${other}. Use that entry or correct the email.`);
  if (github && entry.github?.toLowerCase() === github.toLowerCase())
    problems.push(`GitHub username is already registered to ${other}. Use that entry or correct the username.`);
}
if (!name) problems.push('No name. Pass --name, or set git config user.name.');
if (!email) problems.push('No email. Pass --email, or set git config user.email.');
if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}

const entry = {
  studioId: allocateResourceIdentity(retainedResourceIds(ROOT, INSTALLED_FILE_TYPES)),
  name,
  github,
  email,
  welcomeDismissed: false,
};
console.log(`${yes ? 'Adding' : 'Proposed'} contributors/${key}.json:\n${JSON.stringify(entry, null, 2)}`);
if (!yes)
  console.log(
    'Name and email come from your Git config, and the GitHub username from the GitHub CLI, unless passed as flags.',
  );
console.log(`Your folder will be src/prototypes/${key}/.`);
if (!github && CONFIG.usage !== 'personal')
  console.log(
    'Warning: no GitHub username (is the GitHub CLI installed and signed in?). Pass --github, or CI will not recognize your pushes.',
  );
if (CONFIG.usage !== 'personal' && PERSONAL.test(email))
  console.log(`Warning: ${email} looks like a personal email. Use your work email, the one in your Git config.`);

if (!yes) {
  console.log('Nothing written. Confirm these values, then rerun with --yes (and any corrections as flags).');
  process.exit(0);
}

fs.mkdirSync(path.dirname(contributorFile(key)), { recursive: true });
fs.writeFileSync(contributorFile(key), JSON.stringify(entry, null, 2) + '\n', { flag: 'wx' });
const folder = path.join(ROOT, 'src', 'prototypes', key);
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(path.join(folder, '.gitkeep'), '');
console.log(`Added contributors/${key}.json and created src/prototypes/${key}/.`);

function ensureFolder(key) {
  const folder = path.join(ROOT, 'src', 'prototypes', key);
  fs.mkdirSync(folder, { recursive: true });
  const keep = path.join(folder, '.gitkeep');
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, '', { flag: 'wx' });
}
