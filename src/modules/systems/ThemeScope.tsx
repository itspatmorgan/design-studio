import { useSyncExternalStore, type ComponentProps } from 'react';
import { SYSTEM_SPECS } from './data/systems';
import { systemColorMode } from './spec';
import { cn } from '@/lib/utils';

// One observer serves every mounted view and preview.
const listeners = new Set<() => void>();
let observer: MutationObserver | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!observer) {
    observer = new MutationObserver(() => listeners.forEach(notify => notify()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}
const snapshot = () => (document.documentElement.classList.contains('dark') ? ('dark' as const) : ('light' as const));

// Only rendered system content receives a mode boundary. Studio content keeps its global mode.
export function ThemeScope({ themeClass, className, style, ...props }: ComponentProps<'div'> & { themeClass: string }) {
  const global = useSyncExternalStore(subscribe, snapshot, () => 'light' as const);
  const system = Object.values(SYSTEM_SPECS).find(spec => spec.themeClass === themeClass);
  const mode = system
    ? systemColorMode(system.colorModes, global)
    : themeClass === 'prototype-unstyled'
      ? global
      : undefined;
  return (
    <div
      {...props}
      className={cn(themeClass, className)}
      data-color-mode={mode}
      style={{ ...style, ...(mode && { colorScheme: mode }) }}
    />
  );
}
