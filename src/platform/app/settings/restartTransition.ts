const key = 'studio:settings-transition';
export function beginSettingsTransition() {
  const style = getComputedStyle(document.querySelector('.studio-theme') ?? document.documentElement);
  sessionStorage.setItem(
    key,
    JSON.stringify({
      started: Date.now(),
      appearance: {
        background: style.getPropertyValue('--background'),
        foreground: style.getPropertyValue('--foreground'),
        muted: style.getPropertyValue('--muted-foreground'),
        border: style.getPropertyValue('--border'),
      },
    }),
  );
  window.dispatchEvent(new Event('studio:settings-applying'));
}
export function finishSettingsTransition() {
  window.dispatchEvent(new Event('studio:settings-ready'));
}
