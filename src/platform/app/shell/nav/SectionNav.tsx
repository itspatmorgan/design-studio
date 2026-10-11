// The container every section's navigation is built in: the panel beside the page (Prototypes, the
// system content, Systems, the Manual). It supplies the sidebar colors, the border, an accessible name, and a
// width you can drag (remembered, and the same for every section), and it hides when the rail's
// toggle (or ⌘;) hides navigation, for every section alike. What goes inside is up to the
// section: a NavHeader (NavHeader.tsx) on top, then a list or tree (NavList.tsx, FileTree.tsx).
import { useContext, useEffect, type ReactNode } from 'react';
import {
  NAV_WIDTH,
  SectionNavPresenceContext,
  useSectionNavOpen,
  useSectionNavWidth,
} from '@/platform/app/shell/appPrefs';
import { cn } from '@/lib/utils';

export function SectionNav({ label, children }: { label: string; children: ReactNode }) {
  const { width, resizing, handleProps } = useSectionNavWidth();
  const open = useSectionNavOpen();
  // Present on the page even while hidden, so the rail can offer to show it again.
  const register = useContext(SectionNavPresenceContext);
  useEffect(() => {
    register(true);
    return () => register(false);
  }, [register]);
  if (!open) return null;
  return (
    <aside
      aria-label={label}
      style={{ width }}
      className='relative flex shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground'
    >
      {children}
      {/* The resize handle: a thin strip over the right border that highlights on hover. */}
      <div
        role='separator'
        aria-orientation='vertical'
        aria-label={`Resize ${label.toLowerCase()}`}
        aria-valuenow={width}
        aria-valuemin={NAV_WIDTH.min}
        aria-valuemax={NAV_WIDTH.max}
        title='Drag to resize. Double-click to reset.'
        tabIndex={0}
        {...handleProps}
        className={cn(
          'absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize touch-none',
          'after:absolute after:inset-y-0 after:right-0 after:w-px after:transition-colors',
          'hover:after:bg-sidebar-ring focus-visible:outline-none focus-visible:after:bg-sidebar-ring',
          resizing && 'after:bg-sidebar-ring',
        )}
      />
    </aside>
  );
}
