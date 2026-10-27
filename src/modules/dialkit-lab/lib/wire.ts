import type { DialConfig, DialKitValueUpdates } from 'dialkit';
export const channel = 'studio-dialkit-lab';
export type Scope = { session: string; runtime: string; identity: string };
export type Panel = { id: string; name: string; config: DialConfig; values: DialKitValueUpdates<DialConfig> };
export type Packet = Scope & { channel: typeof channel; version: 1; sequence: number; kind: 'snapshot' | 'remove' | 'request' | 'update' | 'action' | 'reset'; panel?: Panel; id?: string; path?: string; value?: unknown };
export function validPacket(value: unknown): value is Packet {
  if (!value || typeof value !== 'object') return false;
  const v = value as Packet;
  if (v.channel !== channel || v.version !== 1 || !Number.isSafeInteger(v.sequence) || v.sequence < 0) return false;
  if (![v.session, v.runtime, v.identity].every(s => typeof s === 'string' && s.length > 0 && s.length < 2048)) return false;
  if (!['snapshot', 'remove', 'request', 'update', 'action', 'reset'].includes(v.kind)) return false;
  try { if (JSON.stringify(value).length > 24000) return false; } catch { return false; }
  const safe = (x: unknown, depth = 0): boolean => {
    if (depth > 8) return false;
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return true;
    if (typeof x === 'number') return Number.isFinite(x);
    if (Array.isArray(x)) return x.length <= 64 && x.every(item => safe(item, depth + 1));
    return typeof x === 'object' && Object.entries(x).every(([key, item]) => !['__proto__', 'prototype', 'constructor'].includes(key) && safe(item, depth + 1));
  };
  if (!safe(value)) return false;
  if (v.kind === 'snapshot') return !!v.panel && typeof v.panel.id === 'string' && typeof v.panel.name === 'string' && v.panel.id.length <= 128 && v.panel.name.length <= 128 && !!v.panel.config && typeof v.panel.config === 'object' && !Array.isArray(v.panel.config) && !!v.panel.values && typeof v.panel.values === 'object' && !Array.isArray(v.panel.values);
  if (v.kind === 'request') return true;
  return typeof v.id === 'string' && (v.kind !== 'update' && v.kind !== 'action' || typeof v.path === 'string');
}
export const sameScope = (a: Scope, b: Scope) => a.session === b.session && a.runtime === b.runtime && a.identity === b.identity;

export function acceptsPacket(event: Pick<MessageEvent, 'source' | 'origin' | 'data'>, source: MessageEventSource | null, origin: string, scope: Scope): event is MessageEvent<Packet> {
  return source !== null && event.source === source && event.origin === origin && validPacket(event.data) && sameScope(scope, event.data);
}
