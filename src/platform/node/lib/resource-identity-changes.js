// Identity invariants apply before permission checks, including personal studios.
// A proposed grant or ownership declaration cannot authorize its own mutation.
export function resourceIdentityChangeProblems(before, after) {
  const problems = [
    ...after.missing.map(
      file => `After: ${file}: permanent identity is missing; run an explicit identity assignment or migration.`,
    ),
    ...before.problems.map(problem => `Before: ${problem}`),
    ...after.problems.map(problem => `After: ${problem}`),
  ];
  const byPath = resources => new Map(resources.map(resource => [resource.path, resource]));
  const byId = resources =>
    new Map(resources.filter(resource => resource.studioId).map(resource => [resource.studioId, resource]));
  const afterPath = byPath(after.resources);
  const beforeId = byId(before.resources),
    afterId = byId(after.resources);
  const prototypeIds = resources =>
    new Map(
      resources
        .filter(resource => resource.kind === 'prototype')
        .map(resource => [resource.path.replace(/\/meta\.json$/, ''), resource.studioId]),
    );
  const beforeParents = prototypeIds(before.resources),
    afterParents = prototypeIds(after.resources);
  for (const previous of before.resources) {
    if (!previous.studioId) continue; // Explicit first-time migration may add IDs.
    const samePath = afterPath.get(previous.path);
    if (samePath && previous.studioId !== samePath.studioId) {
      // Swapping two named resources is a move, provided both retained identities
      // remain in the inventory. Replacing or erasing an ID in place is forbidden.
      const relocated = afterId.get(previous.studioId);
      const incoming = beforeId.get(samePath.studioId);
      if (!relocated || !incoming || incoming.kind !== previous.kind || relocated.kind !== previous.kind)
        problems.push(`${previous.path}: permanent identity cannot be replaced or removed in place.`);
    }
    const next = afterId.get(previous.studioId);
    if (!next) continue; // Deletion retires the resource rather than reassigning it.
    if (next.kind !== previous.kind) problems.push(`${next.path}: permanent identity cannot change resource kind.`);
    if (
      previous.kind === 'prototype' &&
      previous.ownerContributorId !== undefined &&
      next.ownerContributorId !== previous.ownerContributorId
    )
      problems.push(`${next.path}: prototype owner identity cannot change through a source edit.`);
    if (previous.kind === 'artifact' && beforeParents.get(previous.parent) !== afterParents.get(next.parent))
      problems.push(
        `${next.path}: transferring an identified artifact between prototypes requires an explicit transfer policy.`,
      );
  }
  for (const resource of after.resources) {
    if (resource.kind === 'prototype' && resource.studioId && resource.ownerContributorId === undefined)
      problems.push(`${resource.path}: an identified prototype must declare its contributor ownerContributorId.`);
  }
  return [...new Set(problems)];
}
