// The ⌘K command palette (Ctrl+K on Windows): jump to places, systems, prototypes,
// and Manual chapters. Arrow keys move, Enter opens, Esc closes.
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { PaletteContext } from './paletteContext';
import { isTyping } from '@/platform/app/shell/appPrefs';

// The dialog and its list live in their own file, loaded a moment after the app starts.
const loadDialog = () => import('@/platform/app/shell/CommandPaletteDialog');
const CommandPaletteDialog = lazy(loadDialog);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openPalette = useCallback(() => {
    const active = document.activeElement;
    returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setOpen(true);
  }, []);
  // Mounted from the first time it opens, and kept, so closing can animate.
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (open) setOpened(true);
  }, [open]);
  useEffect(() => {
    const id = setTimeout(loadDialog, 1500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey) || e.repeat) return;
      // When closed, leave ⌘K to text fields (a prototype may use it). When open, always toggle.
      if (!open && isTyping(e.target)) return;
      e.preventDefault();
      if (open) setOpen(false);
      else openPalette();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, openPalette]);

  return (
    <PaletteContext.Provider value={openPalette}>
      {children}
      {opened && (
        <Suspense fallback={null}>
          <CommandPaletteDialog open={open} setOpen={setOpen} returnFocus={returnFocus} />
        </Suspense>
      )}
    </PaletteContext.Provider>
  );
}
