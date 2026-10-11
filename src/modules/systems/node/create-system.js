import { readDeclaration } from '../../../platform/core/declarations.ts';
import { resourceId } from '../../../platform/core/fileTypes.ts';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readContributors } from '../../../../scripts/lib/contributors.js';
import { readSettings } from '../../../../scripts/lib/studio-settings.js';
import { studioRole } from '../../../platform/core/permissions.ts';
const execute = promisify(execFile);

export function createSystem(root, me, body) {
  const { contributors } = readContributors(root);
  const { config } = readSettings(root, contributors);
  if (studioRole(config, me, Object.keys(contributors)) !== 'admin')
    throw Object.assign(new Error('An Admin can create shared systems.'), { status: 403 });
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some(key => key !== 'name') ||
    typeof body.name !== 'string'
  )
    throw new Error('Provide a name for your system.');
  const name = body.name.trim();
  if (!name || name.length > 120 || /[\n\r<>`$\\]/.test(name))
    throw new Error('Use a plain name between 1 and 120 characters.');
  const id = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('Start the name with a letter.');
  return apply();
  async function apply() {
    const marker = path.join(root, '.studio-system-operation');
    let locked = false;
    try {
      const fd = fs.openSync(marker, 'wx');
      fs.closeSync(fd);
      locked = true;
      const args = [path.join(root, 'scripts/cli/studio.js'), 'create-system', id, '--label', name];
      const options = { cwd: root, encoding: 'utf8', timeout: 30000 };
      await execute(process.execPath, args, options);
      await execute(process.execPath, [...args, '--yes'], options);
      const declaration = readDeclaration(fs.readFileSync(path.join(root, 'src/systems', id, 'system.ts'), 'utf8'));
      if ('error' in declaration) throw new Error(declaration.error);
      return { id, studioId: resourceId(declaration.value.studioId) };
    } catch (error) {
      throw new Error(
        error.code === 'EEXIST'
          ? 'Another system change is in progress. Try again when it finishes.'
          : error.stderr?.trim() || 'Could not create the system. Existing systems were preserved.',
      );
    } finally {
      if (locked) fs.rmSync(marker, { force: true });
    }
  }
}
