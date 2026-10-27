import { useSyncExternalStore } from 'react';

type Context = { identity: string; prototypeId: string; available: boolean; hidden: boolean };
let current: Context | null = null;
const hiddenViews = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export function reportControls(identity: string, available: boolean) {
  const prototypeId = JSON.parse(identity)[0] as string;
  current = { identity, prototypeId, available, hidden: hiddenViews.has(identity) };
  emit();
  return () => { if (current?.identity === identity) { current = null; emit(); } };
}
export function toggleControls(identity: string) {
  if (hiddenViews.has(identity)) hiddenViews.delete(identity);
  else hiddenViews.add(identity);
  if (current?.identity === identity) { current = { ...current, hidden: hiddenViews.has(identity) }; emit(); }
}
export function useControlVisibility() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => current, () => null);
}
