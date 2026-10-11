// Only the initiating tab carries a creation handoff across the dev server restart.
const key = 'studio:creating-system';
function beginSystemTransition(name: string, operation: 'create' | 'delete', system?: string) {
  const theme = document.querySelector('.studio-theme') ?? document.documentElement;
  const style = getComputedStyle(theme);
  sessionStorage.setItem(
    key,
    JSON.stringify({
      name,
      operation,
      system,
      started: Date.now(),
      appearance: {
        background: style.getPropertyValue('--background'),
        foreground: style.getPropertyValue('--foreground'),
        muted: style.getPropertyValue('--muted-foreground'),
        border: style.getPropertyValue('--border'),
      },
    }),
  );
  window.dispatchEvent(new Event('studio:system-creating'));
}
export function openCreatedSystem(id: string) {
  const pending = JSON.parse(sessionStorage.getItem(key) || 'null');
  if (pending) sessionStorage.setItem(key, JSON.stringify({ ...pending, id }));
  // Vite reloads once the new declarations are ready. Change the destination without
  // navigating into the old module graph or starting a competing document load.
  window.history.replaceState(
    null,
    '',
    `${import.meta.env.BASE_URL.replace(/\/$/, '')}/systems/${encodeURIComponent(id)}`,
  );
  window.dispatchEvent(new Event('studio:system-creating'));
}
export function finishSystemCreation(id?: string) {
  window.dispatchEvent(new CustomEvent('studio:system-created', { detail: { id } }));
}

export function beginSystemCreation(name: string) {
  beginSystemTransition(name, 'create');
}
export function beginSystemDeletion(name: string, system: string) {
  beginSystemTransition(name, 'delete', system);
  // A restart must land on the collection, never on the disappearing system.
  window.history.replaceState(null, '', import.meta.env.BASE_URL.replace(/\/$/, '') + '/systems');
}
export function finishSystemDeletion(systems: Record<string, unknown>, manifestSystems: Record<string, unknown>) {
  const pending = JSON.parse(sessionStorage.getItem(key) || 'null');
  if (
    pending?.operation === 'delete' &&
    !Object.hasOwn(systems, pending.system) &&
    !Object.hasOwn(manifestSystems, pending.system)
  )
    finishSystemCreation();
}
