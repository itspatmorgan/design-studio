// Excalidraw's Help dialog lists every shortcut it has and can't be customized. Some of them do
// nothing on a canvas here, so the dialog would advertise them. This hides those rows. Rows are
// hidden with inline `display: none`, never removed: React owns them, and deleting its nodes
// breaks its next update.
import { useEffect } from 'react';

// Excalidraw's own labels for the shortcuts we don't support, and why.
const UNSUPPORTED = new Set([
  'Toggle grid', // remapped by the platform; the canvas menu shows its shortcut
  'Insert image', // images are off: they'd be stored inside the canvas file
  'Crop image',
  'Finish image cropping',
  'Reset the canvas', // wiping a canvas isn't offered
  'Toggle light/dark theme', // the canvas follows the app's color mode
  'View mode', // set by the app (a canvas you can't edit is read-only)
  'Command palette', // Excalidraw's isn't mounted; ⌘K is the app's own
]);

function prune() {
  const dialog = document.querySelector('.HelpDialog');
  if (!dialog) return;
  for (const row of dialog.querySelectorAll<HTMLElement>('.HelpDialog__shortcut')) {
    if (UNSUPPORTED.has(row.firstElementChild?.textContent?.trim() ?? '')) row.style.display = 'none';
  }
  for (const section of dialog.querySelectorAll<HTMLElement>('.HelpDialog__island')) {
    const rows = [...section.querySelectorAll<HTMLElement>('.HelpDialog__shortcut')];
    if (rows.length && rows.every(row => row.style.display === 'none')) section.style.display = 'none';
  }
}

// Prunes the Help dialog whenever it opens (it renders into a portal outside the canvas).
export function useHelpDialogPruning() {
  useEffect(() => {
    prune();
    const observer = new MutationObserver(prune);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
