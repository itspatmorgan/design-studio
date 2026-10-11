// Section policies describe artifact ownership. Shared source writes additionally
// require resource authority through canPerform. Local identity is workflow policy,
// not filesystem authentication. Runtime import boundaries are independent.
export { studioRole } from './config.ts';
import { SYSTEM_CONTENT_KEY, systemIdOfPath } from './roots.ts';
import type { ModuleSpec } from './modules/index.ts';

export type Policy = 'owner' | 'maintainers' | 'open' | 'none';

// What the policy needs to know: who is asking (their contributor key, or null), the key the item
// is under, and its maintainers if it has any.
export type Subject = { me: string | null; key: string; maintainers?: readonly string[] };

// meta.json "maintainers" if it's a list of at least one key, else null. Keys repeat nothing.
export const parseMaintainers = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || !value.length) return null;
  if (!value.every(k => typeof k === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(k))) return null;
  return [...new Set(value as string[])];
};

// Whether `key` (your contributor key, or null) is one of these maintainers.
export const canMaintain = (maintainers: readonly string[] | undefined, key: string | null) =>
  Boolean(key && maintainers?.includes(key));

// The policy of the section a key opens: a module's, else "owner" (a contributor's folder).
export function policyFor(key: string, modules: readonly ModuleSpec[]): Policy {
  if (key === SYSTEM_CONTENT_KEY) return 'open';
  const section = modules.find(m => m.section?.key === key)?.section;
  return section ? (section.policy ?? 'none') : 'owner';
}

// Whether you own it: its contributor, or one of its maintainers. Owning is what lets you archive,
// delete, publish or unpublish, and it is never true of open files.
export function canOwn(policy: Policy, { me, key, maintainers }: Subject): boolean {
  if (policy === 'owner') return me !== null && key === me;
  if (policy === 'maintainers') return canMaintain(maintainers, me);
  return false;
}

// Whether you may change its files.
export const canChange = (policy: Policy, subject: Subject) => canOwn(policy, subject);

// The sentence for why you can't, when you can't.
export function whyNot(policy: Policy, me: string | null): string {
  if (policy === 'none') return "This can't be changed from the app.";
  if (!me) return "You're not set up as a contributor yet. Ask your agent to add you.";
  if (policy === 'maintainers') return 'Only its maintainers can change it.';
  return 'This prototype belongs to someone else. You can change only your own.';
}

import { studioRole as roleOf, type StudioConfig } from './config.ts';

export type Resource =
  | { kind: 'prototype'; owner: string }
  | { kind: 'system'; id: string; role: 'platform' | 'prototype'; status: 'active' | 'archived' }
  | { kind: 'platform' | 'module' };
export type ResourceAction = 'read' | 'edit' | 'rename' | 'manage';

// Runtime import boundaries remain separate from human write authority.
export function canPerform(
  config: Partial<StudioConfig>,
  actor: string | null,
  contributors: readonly string[],
  resource: Resource,
  action: ResourceAction,
): boolean {
  if (action === 'read') return true;
  const role = roleOf(config, actor, contributors);
  if (!role) return false;
  if (resource.kind === 'prototype') return role === 'admin' || resource.owner === actor;
  if (resource.kind !== 'system') return role === 'admin';
  if (!config.systems?.includes(resource.id)) return false;
  if (resource.role === 'platform') return role === 'admin' && action === 'edit';
  if (action === 'manage') return role === 'admin';
  if (resource.status !== 'active') return false;
  return role === 'admin' || Boolean(actor && config.systemMaintainers?.[resource.id]?.includes(actor));
}

export function pathResource(
  file: string,
  systems: Record<string, { role: 'platform' | 'prototype'; status: 'active' | 'archived' }>,
): Resource {
  const parts = file.replace(/^\/?src\//, '').split('/');
  if (parts[0] === 'prototypes' && parts[1]) return { kind: 'prototype', owner: parts[1] };
  const system = systemIdOfPath(file);
  if (system && systems[system]) return { kind: 'system', id: system, ...systems[system] };
  return { kind: parts[0] === 'modules' ? 'module' : 'platform' };
}

// Availability and identity changes must go through managed lifecycle operations.
export const sameSystemIdentity = (before: Record<string, unknown>, after: Record<string, unknown>) =>
  ['studioId', 'role', 'status', 'label'].every(key => before[key] === after[key]);
