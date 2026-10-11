// Source-metadata stage of the migration. The platform migration must compose
// this with relationship/route changes before offering an apply command.
import fs from 'node:fs';
import path from 'node:path';
import { createResourceId, resourceId, canvasIdentity } from '../../core/resourceIdentity.ts';
import { readDeclaration } from '../../core/declarations.ts';
import { auditResourceIdentities } from './resource-identity-audit.js';
import { applySetupChanges, editDeclaration } from './studio-setup.js';

function withIdentity(resource, source, id, types) {
  if (resource.kind === 'artifact') return types[resource.fileType].identity.write(source, id);
  if (resource.kind === 'system') {
    const after = editDeclaration(source, { studioId: id });
    const checked = readDeclaration(after);
    if ('error' in checked || checked.value.studioId !== id)
      throw new Error(`${resource.path}: cannot preserve the system declaration.`);
    return source.includes('\r\n') ? after.replace(/\r?\n/g, '\r\n') : after;
  }
  return canvasIdentity.write(source, id); // same top-level JSON identity contract
}

// ids is an optional path->ID allocation retained from an earlier preview.
// Existing identities are never reassigned. A collision is retried before any write.
export function planSourceIdentityMigration(
  root,
  types,
  { ids = {}, generate = createResourceId, select = () => true } = {},
) {
  const audit = auditResourceIdentities(root, types);
  if (audit.problems.length) throw new Error(audit.problems.join('\n'));
  const used = new Set(audit.resources.flatMap(resource => (resource.studioId ? [resource.studioId] : [])));
  const locations = new Set(audit.resources.map(resource => resource.path));
  for (const file of Object.keys(ids))
    if (!locations.has(file)) throw new Error(`${file}: identity allocation is outside the current inventory.`);
  const snapshot = [],
    resources = [],
    changes = [];
  for (const resource of audit.resources) {
    const before = fs.readFileSync(path.join(root, resource.path), 'utf8');
    snapshot.push({ ...resource, before });
    let id = resource.studioId;
    if (id && ids[resource.path] !== undefined && ids[resource.path] !== id)
      throw new Error(`${resource.path}: an existing identity cannot be reassigned by migration.`);
    if (!id && select(resource)) {
      if (ids[resource.path] !== undefined) {
        id = resourceId(ids[resource.path]);
        if (used.has(id)) throw new Error(`${resource.path}: preview allocation conflicts with resource ID ${id}.`);
      } else {
        for (let attempt = 0; attempt < 32; attempt++) {
          const candidate = resourceId(generate());
          if (!used.has(candidate)) {
            id = candidate;
            break;
          }
        }
        if (!id) throw new Error(`${resource.path}: could not allocate a unique resource identity.`);
      }
      used.add(id);
      changes.push({ path: resource.path, before, after: withIdentity(resource, before, id, types) });
    }
    resources.push({ ...resource, studioId: id });
  }
  return { stage: 'source-metadata', snapshot, resources, changes };
}

// This internal stage accepts only a freshly recomputed plan. Neither arbitrary
// path edits nor a hand-edited "after" payload are trusted. Inventory additions,
// removals, symlinks, edits and metadata conflicts all invalidate the preview.
export function applySourceIdentityMigration(root, types, plan) {
  if (plan?.stage !== 'source-metadata' || !Array.isArray(plan.resources))
    throw new Error('Review a source identity migration plan first.');
  const ids = Object.fromEntries(plan.resources.map(resource => [resource.path, resource.studioId]));
  const current = planSourceIdentityMigration(root, types, { ids });
  if (JSON.stringify(current) !== JSON.stringify(plan))
    throw new Error('The source inventory or migration plan changed. Generate and review a fresh preview.');
  const edits = current.changes.map(change => ({
    file: path.join(root, change.path),
    before: change.before,
    after: change.after,
  }));
  applySetupChanges(edits);
  try {
    const audit = auditResourceIdentities(root, types);
    if (audit.problems.length || audit.missing.length)
      throw new Error(
        [...audit.problems, ...audit.missing.map(file => `${file}: identity is still missing.`)].join('\n'),
      );
    if (JSON.stringify(audit.resources) !== JSON.stringify(current.resources))
      throw new Error('The identity inventory changed during migration.');
    return audit;
  } catch (error) {
    // Stale guards also protect rollback: never overwrite a new concurrent edit.
    try {
      applySetupChanges(edits.map(edit => ({ ...edit, before: edit.after, after: edit.before })).reverse());
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Identity migration failed and rollback needs review.');
    }
    throw error;
  }
}
