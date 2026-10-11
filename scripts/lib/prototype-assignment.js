// Shared by manifest validation and agent context inspection. A rebuild is a
// request, never a substitute for the current runtime assignment.
import { resourceId } from '../../src/platform/core/resourceIdentity.ts';
import { systemKeyFromDeclarations } from '../../src/platform/core/resourceReferences.ts';

export function prototypeAssignment(meta, systems) {
  let system = null,
    systemId = null,
    rebuild;
  const problems = [];
  try {
    if (!Object.hasOwn(meta, 'systemId'))
      throw new Error(
        'declare systemId explicitly as an installed system ID or null; the default is used only when creating a prototype',
      );
    for (const field of ['system', 'ownerId', 'archivedBySystem'])
      if (Object.hasOwn(meta, field)) throw new Error(`obsolete ${field} field; use explicit relationship ID fields`);
    if (meta.archivedBySystemId !== undefined) systemKeyFromDeclarations(resourceId(meta.archivedBySystemId), systems);
    systemId = meta.systemId === null ? null : resourceId(meta.systemId);
    if (meta.systemMissing !== undefined) {
      if (
        !meta.systemMissing ||
        typeof meta.systemMissing !== 'object' ||
        Object.hasOwn(meta.systemMissing, 'id') ||
        systemId === null ||
        meta.systemMissing.systemId !== systemId ||
        typeof meta.systemMissing.label !== 'string' ||
        !meta.systemMissing.label ||
        Object.values(systems).some(spec => spec.studioId === systemId)
      )
        throw new Error('invalid systemMissing metadata; retain the deleted ID and label until rebuilt');
      system = systemId; // Retained missing identity, never interpreted as a folder.
    } else if (systemId !== null) system = systemKeyFromDeclarations(systemId, systems);
  } catch (error) {
    problems.push(`has an invalid system assignment: ${error.message}`);
  }
  if (meta.rebuild !== undefined) {
    try {
      if (!meta.rebuild || typeof meta.rebuild !== 'object' || Array.isArray(meta.rebuild))
        throw new Error('declare rebuild as an object');
      if (Object.hasOwn(meta.rebuild, 'targetSystem') || Object.hasOwn(meta.rebuild, 'source'))
        throw new Error('use targetSystemId and sourcePrototypeId in rebuild');
      const targetId = meta.rebuild.targetSystemId === null ? null : resourceId(meta.rebuild.targetSystemId);
      rebuild = {
        ...meta.rebuild,
        targetSystemKey: targetId === null ? null : systemKeyFromDeclarations(targetId, systems),
        targetSystemId: targetId,
        sourcePrototypeId: resourceId(meta.rebuild.sourcePrototypeId),
      };
    } catch (error) {
      problems.push(`has an invalid rebuild request: ${error.message}`);
    }
  }
  return { system, systemId, rebuild, problems };
}
