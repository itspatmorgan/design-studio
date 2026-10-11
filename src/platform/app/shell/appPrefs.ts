// App UI preferences, saved in localStorage so they survive a reload.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { flushSync } from 'react-dom';

const COLOR_MODE_KEY = 'design-studio:color-mode'; // "light" | "dark"; unset = follow the system
const SECTION_NAV_KEY = 'design-studio:section-nav'; // "open" | "closed"
const SECTION_NAV_WIDTH_KEY = 'design-studio:section-nav-width'; // pixels
const SHOW_ALL_FILES_KEY = 'design-studio:show-all-files'; // "shown" | "hidden"

const systemMode = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

// Studio follows the global mode. Rendered systems resolve it within their ThemeScope.
// Follows the system until you pick a mode with the toggle.
export function useColorMode() {
  const [colorMode, setColorMode] = useState(() => localStorage.getItem(COLOR_MODE_KEY) ?? systemMode());

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
  }, [colorMode]);

  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!localStorage.getItem(COLOR_MODE_KEY)) setColorMode(systemMode());
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggleColorMode = useCallback(() => {
    const flip = () =>
      flushSync(() =>
        setColorMode(mode => {
          const next = mode === 'dark' ? 'light' : 'dark';
          localStorage.setItem(COLOR_MODE_KEY, next);
          return next;
        }),
      );
    // Cross-fade when the browser supports it and motion is welcome.
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(flip);
    } else flip();
  }, []);

  return { colorMode, toggleColorMode };
}

// True when focus is in a text field, so shortcuts don't steal keystrokes.
export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

// The section navigation's open/closed state, shared by every section (Prototypes, the system content,
// Systems, and any module's section). ⌘; (Ctrl+; on Windows) and the rail's toggle change it.
export function useSectionNav() {
  const [open, setOpen] = useState(() => localStorage.getItem(SECTION_NAV_KEY) !== 'closed');

  useEffect(() => {
    localStorage.setItem(SECTION_NAV_KEY, open ? 'open' : 'closed');
  }, [open]);

  const toggle = useCallback(() => setOpen(o => !o), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const inSourceEditor = e.target instanceof HTMLElement && Boolean(e.target.closest('.cm-editor'));
      if (
        e.key !== ';' ||
        !(e.metaKey || e.ctrlKey) ||
        e.altKey ||
        e.shiftKey ||
        e.repeat ||
        e.isComposing ||
        (isTyping(e.target) && !inSourceEditor)
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };
    // Handle the reserved navigation shortcut before the editor's own key handling.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [toggle]);

  return { open, toggle };
}

// Whether the prototype navigation lists every file, not just what the app opens (dev only). Shared
// by the tree that shows it and the menu that switches it, and the same for every prototype.
const showAllListeners = new Set<() => void>();
export function useShowAllFiles() {
  const showAll = useSyncExternalStore(
    listener => {
      showAllListeners.add(listener);
      return () => {
        showAllListeners.delete(listener);
      };
    },
    () => localStorage.getItem(SHOW_ALL_FILES_KEY) === 'shown',
  );
  const toggle = useCallback(() => {
    localStorage.setItem(SHOW_ALL_FILES_KEY, localStorage.getItem(SHOW_ALL_FILES_KEY) === 'shown' ? 'hidden' : 'shown');
    showAllListeners.forEach(listener => listener());
  }, []);
  return [showAll, toggle] as const;
}

// Whether the section navigation is showing. Each SectionNav (shell/nav/) reads it and hides itself.
export const SectionNavContext = createContext(true);
export const useSectionNavOpen = () => useContext(SectionNavContext);

// A SectionNav tells the shell it is on the page, hidden or not, so the rail shows the toggle
// exactly when there is a navigation to toggle.
export const SectionNavPresenceContext = createContext<(present: boolean) => void>(() => {});

// The section navigation's width, the same for every section. Drag its right edge (or focus the edge and use the
// arrow keys) to resize; double-click or Enter resets it. Saved when you let go.
export const NAV_WIDTH = { default: 220, min: 180, max: 420 };
const clampWidth = (w: number) => Math.min(NAV_WIDTH.max, Math.max(NAV_WIDTH.min, Math.round(w)));

export function useSectionNavWidth() {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SECTION_NAV_WIDTH_KEY));
    return saved ? clampWidth(saved) : NAV_WIDTH.default;
  });
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (!resizing) localStorage.setItem(SECTION_NAV_WIDTH_KEY, String(width));
  }, [width, resizing]);

  // While dragging, keep the resize cursor everywhere and stop text from being selected.
  useEffect(() => {
    if (!resizing) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  const handleProps = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      setResizing(true);
      const onMove = (m: PointerEvent) => setWidth(clampWidth(startWidth + m.clientX - startX));
      const onUp = () => {
        setResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    onDoubleClick: () => setWidth(NAV_WIDTH.default),
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      const step = e.shiftKey ? 24 : 8;
      const next = {
        ArrowLeft: width - step,
        ArrowRight: width + step,
        Home: NAV_WIDTH.min,
        End: NAV_WIDTH.max,
        Enter: NAV_WIDTH.default,
      }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      setWidth(clampWidth(next));
    },
  };

  return { width, resizing, handleProps };
}
