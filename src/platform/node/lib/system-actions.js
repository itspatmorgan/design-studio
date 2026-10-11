import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readContributors } from './contributors.js';
import { readSettings } from './studio-settings.js';
import { editorFile, openEditor } from '../build/files/editor.js';
import { reveal } from '../build/files/ops.js';
import { readDeclaration } from '../../core/modules/pack.ts';
import { canPerform, studioRole } from '../../core/permissions.ts';
import { planSystemLifecycle, systemDependents } from './system-lifecycle.js';
import { systemDirOf } from './system-folders.js';

/** @returns {never} */
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function cli(root, args, apply = false) {
  const command = [path.join(root, 'src/platform/node/cli/studio.js'), ...args];
  const options = { cwd: root, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] };
  try {
    execFileSync(process.execPath, command, options);
    const output = apply ? execFileSync(process.execPath, [...command, '--yes'], options) : '';
    const last = output.trim().split('\n').at(-1);
    return last?.startsWith('{') ? JSON.parse(last) : {};
  } catch (error) {
    fail(error.stderr?.trim() || error.stdout?.trim() || 'Could not update the system.');
  }
}
export async function systemAction(root, actor, body) {
  const { contributors } = readContributors(root);
  const { config } = readSettings(root, contributors);
  const role = studioRole(config, actor, Object.keys(contributors));
  if (!role) fail('Register a contributor to use local system actions.', 403);
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string')
    fail('Choose a system action.');
  const { action, system, name, restorePrototypes } = body;
  if (!['open', 'reveal', 'rename'].includes(action) && role !== 'admin')
    fail('Only an Admin can change shared systems.', 403);
  if (action === 'archived') {
    const items = config.systems.flatMap(id => {
      const declaration = readDeclaration(fs.readFileSync(path.join(root, systemDirOf(root, id), 'system.ts'), 'utf8'));
      if ('error' in declaration || declaration.value.status !== 'archived') return [];
      return [
        {
          id,
          label: declaration.value.label,
          prototypes: systemDependents(root, declaration.value.studioId).filter(
            ({ meta }) => meta.archivedBySystemId === declaration.value.studioId,
          ).length,
        },
      ];
    });
    return { items };
  }
  if (typeof system !== 'string' || !/^[a-z][a-z0-9-]*$/.test(system) || !config.systems.includes(system))
    fail('Choose a registered system.', 404);
  const dir = editorFile(root, systemDirOf(root, system)),
    file = editorFile(root, `${systemDirOf(root, system)}/system.ts`);
  if (!dir || !file) fail('This system must use regular source files.', 404);
  const declaration = readDeclaration(fs.readFileSync(file, 'utf8'));
  if ('error' in declaration) fail(declaration.error);
  const spec = declaration.value;
  if (action === 'open') return openEditor(dir, { reveal });
  if (action === 'reveal') {
    await reveal(dir);
    return {};
  }
  if (spec.role !== 'prototype')
    fail('Studio is maintained by the platform. Its identity and availability are protected.');
  if (
    action === 'rename' &&
    !canPerform(
      config,
      actor,
      Object.keys(contributors),
      { kind: 'system', id: system, role: spec.role, status: spec.status },
      'rename',
    )
  )
    fail('Only an Admin or an assigned system maintainer can rename this system.', 403);
  if (action === 'default') {
    if (spec.status !== 'active') fail('Restore this system before making it the default.');
    cli(root, ['configure', '--system', system], true);
    return { id: system };
  }
  const operation = action.endsWith('-check') ? action.slice(0, -6) : action;
  if (!['rename', 'archive', 'restore', 'delete'].includes(operation)) fail('Unknown system action.');
  const plan = planSystemLifecycle(root, config, operation, system, { name, restorePrototypes });
  if (action.endsWith('-check')) return { prototypes: plan.prototypes, references: plan.references };
  const args = [`${operation}-system`, system];
  if (operation === 'rename') args.push('--label', name.trim());
  if (operation === 'restore' && restorePrototypes === true) args.push('--restore-prototypes');
  return cli(root, args, true);
}
