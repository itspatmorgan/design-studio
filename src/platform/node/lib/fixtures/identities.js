// Synthetic fixtures use the same persisted identity contract as source studios.
// Readable selectors remain convenient inputs to the fixture author, not storage.
import fs from 'node:fs';
import path from 'node:path';
import { createResourceId } from '../../../core/resourceIdentity.ts';
import { readDeclaration } from '../../../core/declarations.ts';
import { persistStudioReferences } from '../../../core/resourceReferences.ts';
import { readResourceDirectory } from '../resource-directory.js';
import { editStudioConfig } from '../studio-setup.js';
import { SUPPLIED_SYSTEMS_ROOT, TEAM_SYSTEMS_ROOT } from '../../../core/roots.ts';

export function writeFixtureConfig(root, config, { comment = '' } = {}) {
  for (const key of config.systems) {
    // The platform system (Studio) lives in the supplied root, the others in the team's.
    const file = path.join(root, key === 'studio' ? SUPPLIED_SYSTEMS_ROOT : TEAM_SYSTEMS_ROOT, key, 'system.ts');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file))
      fs.writeFileSync(
        file,
        `export default { role: '${key === 'studio' ? 'platform' : 'prototype'}', status: 'active', label: '${key}' };\n`,
      );
    const source = fs.readFileSync(file, 'utf8'),
      declaration = readDeclaration(source);
    if ('error' in declaration) throw new Error(declaration.error);
    if (!declaration.value.studioId) fs.writeFileSync(file, editStudioConfig(source, { studioId: createResourceId() }));
  }
  const directory = readResourceDirectory(root);
  const persisted = persistStudioReferences(config, directory);
  fs.writeFileSync(
    path.join(root, 'studio.config.ts'),
    comment + 'export default ' + JSON.stringify(persisted) + ';\n',
  );
  return { directory, persisted };
}
