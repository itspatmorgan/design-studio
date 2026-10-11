import type { PrototypeInfo } from './types';

export function matchesSystem(prototype: PrototypeInfo, system?: string) {
  return system === undefined || prototype.system === system;
}

// A bounded preview of active work; the gallery remains the full collection.
export function systemUsage<T extends PrototypeInfo>(prototypes: T[], system: string) {
  const active = prototypes
    .filter(proto => matchesSystem(proto, system) && proto.status !== 'archived')
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
  return { count: active.length, recent: active.slice(0, 3) };
}
