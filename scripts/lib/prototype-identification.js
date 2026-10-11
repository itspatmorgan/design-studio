// Explicit identity assignment for directly authored prototype files. Normal
// reads/builds never assign IDs, and an existing identity or owner is immutable.
import fs from 'node:fs';
import path from 'node:path';
import { planSourceIdentityMigration } from './resource-identity-migration.js';
import { readPersistedStudioConfig } from './persisted-studio-config.js';
import { canonicalDirectory } from './safe-paths.js';
import { resourceId, jsonIdentity } from '../../src/platform/core/resourceIdentity.ts';
import { canPerform } from '../../src/platform/core/permissions.ts';
import { prototypeAssignment } from './prototype-assignment.js';
import { readDeclaration } from '../../src/platform/core/declarations.ts';
import { auditResourceIdentities } from './resource-identity-audit.js';
import { applySetupChanges } from './studio-setup.js';

export function planPrototypeIdentification(root, types, folder, actor, { ids = {} } = {}) {
  const absolute = path.resolve(root, folder),
    relative = path.relative(root, absolute).split(path.sep).join('/');
  const match = /^src\/prototypes\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9._-]*)$/i.exec(relative);
  if (!match || !canonicalDirectory(absolute, root))
    throw new Error('Identify an existing contributor-owned prototype folder without symbolic links.');
  const current = readPersistedStudioConfig(root);
  const ownerContributorId = resourceId(current.directory.contributorIds[match[1]]);
  if (
    !canPerform(
      current.config,
      actor,
      Object.keys(current.directory.contributorIds),
      { kind: 'prototype', owner: match[1] },
      'edit',
    )
  )
    throw new Error('Only the prototype owner or an Admin can assign its missing identities.');
  const metadataFile = path.join(absolute, 'meta.json');
  const before = fs.readFileSync(metadataFile, 'utf8');
  jsonIdentity(before);
  const metadata = JSON.parse(before);
  if (metadata.ownerContributorId !== undefined && metadata.ownerContributorId !== ownerContributorId)
    throw new Error('Prototype owner identity does not match its contributor folder.');
  const systems = Object.fromEntries(
    current.config.systems
      .map(key => {
        const declaration = readDeclaration(fs.readFileSync(path.join(root, 'src/systems', key, 'system.ts'), 'utf8'));
        if ('error' in declaration) throw new Error(declaration.error);
        return [key, declaration.value];
      })
      .filter(([, spec]) => spec.role === 'prototype'),
  );
  const assignment = prototypeAssignment(metadata, systems);
  if (assignment.problems.length) throw new Error(assignment.problems.join('\n'));
  const selected = resource => resource.path === `${relative}/meta.json` || resource.parent === relative;
  const source = planSourceIdentityMigration(root, types, { ids, select: selected });
  const changes = source.changes;
  if (metadata.ownerContributorId === undefined) {
    const change = changes.find(change => change.path === `${relative}/meta.json`);
    const after = JSON.stringify({ ...JSON.parse(change?.after ?? before), ownerContributorId }, null, 2) + '\n';
    if (change) change.after = after;
    else changes.push({ path: `${relative}/meta.json`, before, after });
  }
  return {
    stage: 'prototype-identification',
    folder: relative,
    configSource: current.source,
    directory: current.directory,
    snapshot: source.snapshot,
    resources: source.resources.filter(selected),
    changes,
  };
}

export function applyPrototypeIdentification(root, types, plan, actor) {
  if (plan?.stage !== 'prototype-identification' || !Array.isArray(plan.resources))
    throw new Error('Review a prototype identity preview first.');
  const ids = Object.fromEntries(plan.resources.map(resource => [resource.path, resource.studioId]));
  const current = planPrototypeIdentification(root, types, plan.folder, actor, { ids });
  if (JSON.stringify(current) !== JSON.stringify(plan))
    throw new Error('Prototype identity preview or inventory changed. Review it again.');
  const edits = current.changes.map(change => ({
    file: path.join(root, change.path),
    before: change.before,
    after: change.after,
  }));
  applySetupChanges(edits);
  try {
    const audit = auditResourceIdentities(root, types);
    if (
      audit.problems.length ||
      current.resources.some(
        resource => !audit.resources.some(next => next.path === resource.path && next.studioId === resource.studioId),
      )
    )
      throw new Error('Prototype identity verification failed after assignment.');
    for (const edit of edits)
      if (fs.readFileSync(edit.file, 'utf8') !== edit.after)
        throw new Error('Source changed during prototype identity assignment.');
    const next = readPersistedStudioConfig(root);
    if (next.source !== current.configSource || JSON.stringify(next.directory) !== JSON.stringify(current.directory))
      throw new Error('Authority changed during prototype identity assignment.');
  } catch (error) {
    try {
      applySetupChanges(edits.map(edit => ({ ...edit, before: edit.after, after: edit.before })).reverse());
    } catch (rollback) {
      throw new AggregateError([error, rollback], 'Identity assignment failed and rollback needs review.');
    }
    throw error;
  }
  return {
    prototypeId: current.resources.find(resource => resource.kind === 'prototype').studioId,
    changed: current.changes.length,
  };
}
