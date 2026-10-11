import fs from 'node:fs';
import path from 'node:path';
import { resourceId } from '../../src/platform/core/resourceIdentity.ts';
import { readDeclaration } from '../../src/platform/core/declarations.ts';
import { persistStudioReferences, resolveStudioReferences } from '../../src/platform/core/resourceReferences.ts';
import { readResourceDirectory } from './resource-directory.js';
import { auditResourceIdentities } from './resource-identity-audit.js';
import { editStudioConfig } from './studio-setup.js';

// Source IDs must be complete first. This stage is composed into the guarded
// saved-preview migration; ordinary runtime readers do not accept source keys.
export function planResourceRelationshipMigration(root, types) {
  const audit = auditResourceIdentities(root, types);
  if (audit.problems.length || audit.missing.length)
    throw new Error('Complete valid source identities before migrating relationships.');
  const directory = readResourceDirectory(root);
  const changes = [];
  const configFile = path.join(root, 'studio.config.ts'),
    configBefore = fs.readFileSync(configFile, 'utf8');
  const declaration = readDeclaration(configBefore);
  if ('error' in declaration) throw new Error(declaration.error);
  const configuration = declaration.value;
  // Migration alone accepts source keys. Already migrated IDs are preserved and
  // validated; ordinary runtime lookup never falls back to mutable keys.
  const persisted = (reference, ids, keys, kind) => {
    if (typeof reference !== 'string') throw new Error(`Invalid ${kind} reference.`);
    if (Object.hasOwn(ids, reference)) return ids[reference];
    const id = resourceId(reference);
    if (!Object.hasOwn(keys, id))
      throw new Error(`Unknown ${kind} identity ${id}. Restore or explicitly repair its source relationship.`);
    return id;
  };
  const system = ref => (ref === null ? null : persisted(ref, directory.systemIds, directory.systemKeys, 'system'));
  const person = ref => persisted(ref, directory.contributorIds, directory.contributorKeys, 'contributor');
  const nextConfig = {
    ...configuration,
    defaultSystem: system(configuration.defaultSystem),
    ...(configuration.admins !== undefined && { admins: configuration.admins.map(person) }),
    systemMaintainers: Object.fromEntries(
      Object.entries(configuration.systemMaintainers).map(([key, people]) => [system(key), people.map(person)]),
    ),
  };
  // Assert that all serialized relationships round-trip through current source selectors.
  const runtime = resolveStudioReferences(nextConfig, directory);
  if (JSON.stringify(persistStudioReferences(runtime, directory)) !== JSON.stringify(nextConfig))
    throw new Error('Relationship migration cannot round-trip configuration.');
  const configAfter = editStudioConfig(configBefore, {
    defaultSystem: nextConfig.defaultSystem,
    ...(nextConfig.admins !== undefined && { admins: nextConfig.admins }),
    systemMaintainers: nextConfig.systemMaintainers,
  });
  if (configBefore !== configAfter) changes.push({ file: configFile, before: configBefore, after: configAfter });
  const prototypes = audit.resources.filter(resource => resource.kind === 'prototype');
  for (const prototype of prototypes) {
    const file = path.join(root, prototype.path),
      before = fs.readFileSync(file, 'utf8');
    const meta = JSON.parse(before),
      next = { ...meta };
    // Only this reviewed migration accepts previous field names or omissions.
    const reference = (object, field, previous) => {
      if (Object.hasOwn(object, field) && Object.hasOwn(object, previous))
        throw new Error(`${prototype.path}: declare only ${field}, not both relationship fields.`);
      return Object.hasOwn(object, field) ? object[field] : object[previous];
    };
    const owner = reference(meta, 'ownerContributorId', 'ownerId');
    next.ownerContributorId = person(prototype.ownerKey);
    if (owner !== undefined && person(owner) !== next.ownerContributorId)
      throw new Error(`${prototype.path}: owner identity does not match its contributor folder.`);
    const assignment = reference(meta, 'systemId', 'system');
    next.systemId = system(assignment === undefined ? nextConfig.defaultSystem : assignment);
    const archive = reference(meta, 'archivedBySystemId', 'archivedBySystem');
    if (archive !== undefined) next.archivedBySystemId = system(archive);
    delete next.ownerId;
    delete next.system;
    delete next.archivedBySystem;
    if (meta.systemMissing !== undefined)
      throw new Error(
        `${prototype.path}: restore or explicitly reconcile its deleted system before migrating relationships.`,
      );
    if (meta.rebuild !== undefined) {
      const original = reference(meta.rebuild, 'sourcePrototypeId', 'source');
      const source = prototypes.find(
        resource => path.posix.dirname(resource.path) === original || resource.studioId === original,
      );
      if (!source) throw new Error(`${prototype.path}: rebuild source is unavailable.`);
      next.rebuild = {
        ...meta.rebuild,
        targetSystemId: system(reference(meta.rebuild, 'targetSystemId', 'targetSystem')),
        sourcePrototypeId: source.studioId,
      };
      delete next.rebuild.targetSystem;
      delete next.rebuild.source;
    }
    const after = JSON.stringify(next, null, 2) + '\n';
    // Preserve source formatting when no relationship changed.
    if (JSON.stringify(next) !== JSON.stringify(meta)) changes.push({ file, before, after });
  }
  return changes;
}
