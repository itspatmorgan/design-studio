import { useSyncExternalStore } from 'react';

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
const snapshot = () => document.documentElement.classList.contains('dark');

// Recheck on subscription: the shell can apply the saved mode between render and mount.
export const useCanvasDark = () => useSyncExternalStore(subscribe, snapshot, () => false);
