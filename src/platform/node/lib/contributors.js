import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsonIdentity } from '../../core/resourceIdentity.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const CONTRIBUTORS_DIR = path.join(ROOT, 'contributors');
export const KEY = /^[a-z0-9][a-z0-9-]*$/;

const readJson = file => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`${path.relative(ROOT, file)} isn't valid JSON (${e.message}).`);
  }
};

// Each regular contributors/<key>.json profile is the sole declaration for that key.
export function readContributors(root = ROOT) {
  const directory = path.join(root, 'contributors');
  const contributors = Object.create(null);
  const problems = [];
  if (fs.existsSync(directory) && (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()))
    throw new Error('Contributor profiles must use an ordinary directory.');
  const files = fs.existsSync(directory)
    ? fs
        .readdirSync(directory)
        .filter(f => f.endsWith('.json'))
        .sort()
    : [];
  for (const file of files) {
    const key = file.slice(0, -5);
    if (!KEY.test(key)) {
      problems.push(`contributors/${file}: a contributor's key is lowercase letters, numbers, and dashes.`);
      continue;
    }
    const profile = path.join(directory, file);
    const stat = fs.lstatSync(profile);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      problems.push(`contributors/${file} must be an ordinary file.`);
      continue;
    }
    const entry = readJson(profile);
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      problems.push(`contributors/${file} should be { "name": ..., "github": ..., "email": ... }.`);
      continue;
    }
    if (typeof entry.name !== 'string' || !entry.name.trim())
      problems.push(`contributors/${file}: declare a nonempty name.`);
    try {
      jsonIdentity(fs.readFileSync(profile, 'utf8'));
    } catch (error) {
      problems.push(`contributors/${file}: ${error.message}`);
    }
    for (const field of ['email', 'github'])
      if (typeof entry[field] !== 'string')
        problems.push(`contributors/${file}: declare ${field} as a string. Use an empty string when unavailable.`);
    contributors[key] = entry;
  }
  for (const [key, entry] of Object.entries(contributors)) {
    if (entry?.welcomeDismissed !== undefined && typeof entry.welcomeDismissed !== 'boolean')
      problems.push(`Contributor "${key}": welcomeDismissed must be true or false.`);
  }
  for (const field of ['email', 'github', 'studioId']) {
    const identities = new Map();
    for (const [key, entry] of Object.entries(contributors)) {
      const identity = typeof entry[field] === 'string' ? entry[field].trim().toLowerCase() : '';
      if (!identity) continue;
      if (identities.has(identity))
        problems.push(`Contributor "${key}": ${field} is also registered to ${identities.get(identity)}.`);
      else identities.set(identity, key);
    }
  }
  return { contributors, problems };
}

export const loadContributors = () => {
  const { contributors, problems } = readContributors();
  if (problems.length) throw new Error(problems.join('\n'));
  return contributors;
};

// Changes when anyone is added or edited: what a cache of anything worked out from the contributors must key on.
export function contributorsSignature() {
  const stat = f => {
    try {
      const s = fs.statSync(f);
      return `${s.mtimeMs}:${s.size}`;
    } catch {
      return '-';
    }
  };
  const files = fs.existsSync(CONTRIBUTORS_DIR) ? fs.readdirSync(CONTRIBUTORS_DIR).sort() : [];
  return files.map(f => `${f}:${stat(path.join(CONTRIBUTORS_DIR, f))}`).join('|');
}

export const contributorFile = key => path.join(CONTRIBUTORS_DIR, `${key}.json`);
