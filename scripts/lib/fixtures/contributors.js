import fs from 'node:fs';
import path from 'node:path';
import { editStudioConfig } from '../studio-setup.js';
import { createResourceId } from '../../../src/platform/core/resourceIdentity.ts';

export function writeProfiles(root, entries) {
  fs.mkdirSync(path.join(root, 'contributors'), { recursive: true });
  for (const [key, entry] of Object.entries(entries)) {
    const profileFile = path.join(root, 'contributors', `${key}.json`);
    const previous = fs.existsSync(profileFile) ? JSON.parse(fs.readFileSync(profileFile, 'utf8')) : {};
    fs.writeFileSync(
      profileFile,
      JSON.stringify(
        { studioId: previous.studioId ?? createResourceId(), github: '', email: '', welcomeDismissed: false, ...entry },
        null,
        2,
      ) + '\n',
    );
  }
}

// Platform integration tests own their team capability fixture, even in removal baselines.
export function ensureTeamManagement(root) {
  const file = path.join(root, 'src/modules/contributors/module.ts');
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      "export default { id: 'contributors', label: 'Team fixture', version: '0.1.0', optional: true, lib: false, section: { key: 'contributors' } };\n",
    );
  }
  const config = path.join(root, 'studio.config.ts');
  fs.writeFileSync(config, editStudioConfig(fs.readFileSync(config, 'utf8'), { modules: { contributors: true } }));
}
