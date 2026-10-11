// Persisted references carry IDs. Source keys are resolved selectors used by
// existing filesystem APIs; this derived mapping never writes source metadata.
import { resourceId, type ResourceId } from './resourceIdentity.ts';
import type { StudioConfig } from './config.ts';

type Declarations = Readonly<Record<string, { studioId?: unknown }>>;
export type ResourceDirectory = {
  readonly contributorIds: Readonly<Record<string, ResourceId>>;
  readonly contributorKeys: Readonly<Record<string, string>>;
  readonly systemIds: Readonly<Record<string, ResourceId>>;
  readonly systemKeys: Readonly<Record<string, string>>;
};

export function resourceDirectory(contributors: Declarations, systems: Declarations): ResourceDirectory {
  const seen = new Map<string, string>();
  const index = (declarations: Declarations, kind: string) => {
    const ids: Record<string, ResourceId> = Object.create(null);
    const keys: Record<string, string> = Object.create(null);
    for (const [key, declaration] of Object.entries(declarations)) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) throw new Error(`Invalid ${kind} source key "${key}".`);
      let id: ResourceId;
      try {
        id = resourceId(declaration?.studioId);
      } catch {
        throw new Error(`${kind} ${key}: declare a valid permanent studioId before resolving references.`);
      }
      const previous = seen.get(id);
      if (previous) throw new Error(`${kind} ${key}: identity ${id} is already declared by ${previous}.`);
      seen.set(id, `${kind} ${key}`);
      ids[key] = id;
      keys[id] = key;
    }
    return { ids: Object.freeze(ids), keys: Object.freeze(keys) };
  };
  const people = index(contributors, 'Contributor'),
    installed = index(systems, 'System');
  return Object.freeze({
    contributorIds: people.ids,
    contributorKeys: people.keys,
    systemIds: installed.ids,
    systemKeys: installed.keys,
  });
}

function resolve(reference: unknown, mapping: Readonly<Record<string, string>>, kind: string): string {
  const id = resourceId(reference);
  if (!Object.hasOwn(mapping, id))
    throw new Error(`Unknown ${kind} identity "${id}". Check the persisted reference and installed inventory.`);
  return mapping[id];
}
function identify(key: string, mapping: Readonly<Record<string, ResourceId>>, kind: string): ResourceId {
  if (!Object.hasOwn(mapping, key)) throw new Error(`Unknown ${kind} source key "${key}".`);
  return mapping[key];
}

function members(value: unknown, kind: string): readonly string[] {
  if (!Array.isArray(value) || value.some(member => typeof member !== 'string') || new Set(value).size !== value.length)
    throw new Error(`${kind}: declare an array of unique references.`);
  return value;
}
function grants(source: StudioConfig): Record<string, readonly string[]> {
  if (
    !source.systemMaintainers ||
    typeof source.systemMaintainers !== 'object' ||
    Array.isArray(source.systemMaintainers)
  )
    throw new Error('Declare systemMaintainers as an explicit object of identity grants.');
  return source.systemMaintainers;
}

// This explicitly named projection is for source-oriented runtime APIs. The
// original declaration remains the authority for serialization and review.
export function resolveStudioReferences(source: StudioConfig, directory: ResourceDirectory): StudioConfig {
  return {
    ...source,
    defaultSystem: resolve(source.defaultSystem, directory.systemKeys, 'default system'),
    ...(source.admins !== undefined && {
      admins: members(source.admins, 'Admins').map(id => resolve(id, directory.contributorKeys, 'Admin contributor')),
    }),
    systemMaintainers: Object.fromEntries(
      Object.entries(grants(source)).map(([id, people]) => [
        resolve(id, directory.systemKeys, 'maintained system'),
        members(people, 'System maintainers').map(member =>
          resolve(member, directory.contributorKeys, 'system maintainer'),
        ),
      ]),
    ),
  };
}

// Only managed mutation planning calls this. It serializes relationships through
// the current directory rather than persisting mutable names or source keys.
export function persistStudioReferences(runtime: StudioConfig, directory: ResourceDirectory): StudioConfig {
  return {
    ...runtime,
    defaultSystem: identify(runtime.defaultSystem, directory.systemIds, 'default system'),
    ...(runtime.admins !== undefined && {
      admins: members(runtime.admins, 'Admins').map(key =>
        identify(key, directory.contributorIds, 'Admin contributor'),
      ),
    }),
    systemMaintainers: Object.fromEntries(
      Object.entries(grants(runtime)).map(([key, people]) => [
        identify(key, directory.systemIds, 'maintained system'),
        members(people, 'System maintainers').map(member =>
          identify(member, directory.contributorIds, 'system maintainer'),
        ),
      ]),
    ),
  };
}

export const systemKeyForIdentity = (id: unknown, directory: ResourceDirectory) =>
  resolve(id, directory.systemKeys, 'system');
export const contributorKeyForIdentity = (id: unknown, directory: ResourceDirectory) =>
  resolve(id, directory.contributorKeys, 'contributor');
export const systemIdentityForKey = (key: string, directory: ResourceDirectory) =>
  identify(key, directory.systemIds, 'system');

export function systemKeyFromDeclarations(reference: unknown, systems: Declarations): string {
  const id = resourceId(reference);
  const matches = Object.entries(systems).filter(([, declaration]) => declaration.studioId === id);
  if (matches.length !== 1) throw new Error(`System identity ${id} must resolve to exactly one installed system.`);
  return matches[0][0];
}
