import fs from 'node:fs';
import path from 'node:path';
import { KEY } from '../../../../scripts/lib/contributors.js';
import { applySetupChanges } from '../../../../scripts/lib/studio-setup.js';

// The server supplies the resolved contributor; requests cannot select a profile.
export function claimWelcome(root, contributor) {
  if (contributor === null) return null; // Exploration before registration uses browser state.
  if (typeof contributor !== 'string' || !KEY.test(contributor)) throw new Error('Invalid contributor key.');
  const profiles = path.join(root, 'contributors');
  if (fs.existsSync(profiles) && (!fs.lstatSync(profiles).isDirectory() || fs.lstatSync(profiles).isSymbolicLink()))
    throw new Error('Contributor profiles must use an ordinary directory.');
  const profile = path.join(profiles, `${contributor}.json`);
  const read = file => {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Contributor profile must be an ordinary file.');
    const source = fs.readFileSync(file, 'utf8');
    const value = JSON.parse(source);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Contributor profile must be an object.');
    return { source, value };
  };
  if (!fs.existsSync(profile)) throw new Error('Contributor is not registered.');
  const { source, value: entry } = read(profile);
  if (typeof entry.welcomeDismissed !== 'boolean') {
    throw Object.assign(new Error('Declare contributor welcomeDismissed explicitly as false or true.'), {
      status: 422,
    });
  }
  if (entry.welcomeDismissed === true) return false;
  const next = { ...entry, welcomeDismissed: true };
  const after = JSON.stringify(next, null, 2) + '\n';
  applySetupChanges([{ file: profile, before: source, after }]);
  return true;
}
