// One row of the file tree, made draggable and a drop target with Pragmatic drag and drop
// (@atlaskit/pragmatic-drag-and-drop, Apache-2.0). Where a drag is over the row decides the drop:
// the top or bottom edge puts it before or after this row, and the middle of a folder puts it inside.
// FileTree.tsx says what each row accepts and carries out the drop.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachInstruction,
  extractInstruction,
  type Availability,
  type Operation,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import { cn } from '@/lib/utils';

// What a dragged row carries, and what a row under it is.
export const DRAG_KIND = 'studio-path';
export type Dragged = { kind: typeof DRAG_KIND; path: string; dir: boolean; scope: string };
export type Dropped = Operation;
export type Operations = Partial<Record<Operation, Availability>>;

export function DragRow({
  scope,
  path,
  dir,
  canDrag,
  url,
  operationsFor,
  children,
}: {
  scope: string;
  path: string;
  dir: boolean;
  canDrag: boolean;
  // Navigable items also carry the native link payload used by canvas drops.
  url?: string;
  // What dropping `source` here may do: before this row, after it, or inside it (a folder).
  operationsFor: (source: { path: string; dir: boolean }) => Operations;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState<Operation | null>(null);
  const [dragging, setDragging] = useState(false);
  // The latest props, so the registration below doesn't restart on every render.
  const latest = useRef({ operationsFor, url });
  latest.current = { operationsFor, url };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return combine(
      draggable({
        element,
        canDrag: () => canDrag,
        getInitialData: (): Dragged => ({ kind: DRAG_KIND, scope, path, dir }),
        getInitialDataForExternal: () =>
          latest.current.url ? { 'text/plain': latest.current.url, 'text/uri-list': latest.current.url } : {},
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) =>
          source.data.kind === DRAG_KIND &&
          source.data.scope === scope &&
          source.data.path !== path &&
          !String(path).startsWith(`${source.data.path}/`),
        getData: ({ input, element: el, source }) =>
          attachInstruction(
            { path, dir, scope },
            {
              input,
              element: el,
              operations: latest.current.operationsFor({
                path: String(source.data.path),
                dir: Boolean(source.data.dir),
              }),
            },
          ),
        onDrag: ({ self }) => setOver(extractInstruction(self.data)?.operation ?? null),
        onDragLeave: () => setOver(null),
        onDrop: () => setOver(null),
      }),
    );
  }, [scope, path, dir, canDrag]);

  return (
    <div
      ref={ref}
      className={cn('relative rounded-md', dragging && 'opacity-50', over === 'combine' && 'bg-sidebar-foreground/10')}
    >
      {children}
      {(over === 'reorder-before' || over === 'reorder-after') && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-sidebar-ring',
            over === 'reorder-before' ? '-top-px' : '-bottom-px',
          )}
        />
      )}
    </div>
  );
}
