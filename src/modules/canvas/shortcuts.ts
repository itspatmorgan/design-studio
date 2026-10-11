// Canvas keyboard shortcuts on top of Excalidraw's:
//   ⌘. / Ctrl+.  hide or show all canvas controls
//   N            a new sticky note at the pointer (or the middle of the view); editing only
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { CaptureUpdateAction } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { artifactShortcut } from '@/platform/app/shell/artifactShortcuts';
import { noteAt } from './stickyNotes';

const typing = (target: EventTarget | null) =>
  (target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable="true"]');

export function useCanvasShortcuts(
  api: ExcalidrawImperativeAPI | null,
  container: RefObject<HTMLElement | null>,
  { editable }: { editable: boolean },
) {
  const [controlsHidden, setControlsHidden] = useState(false);
  const toggleControls = useCallback(() => setControlsHidden(hidden => !hidden), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '.' || !(event.metaKey || event.ctrlKey) || typing(event.target)) return;
      event.preventDefault();
      toggleControls();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleControls]);

  // Reserve unshifted apostrophe for source. Handle the shifted grid combination before
  // Excalidraw's handler, which otherwise accepts both combinations.
  useEffect(() => {
    const el = container.current;
    if (!el || !api) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = artifactShortcut(event);
      if (!action || typing(event.target) || el.querySelector('[role="dialog"], [role="menu"]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (action === 'grid')
        api.updateScene({
          appState: { gridModeEnabled: !api.getAppState().gridModeEnabled, objectsSnapModeEnabled: false },
          captureUpdate: CaptureUpdateAction.EVENTUALLY,
        });
    };
    el.addEventListener('keydown', onKeyDown, true);
    return () => el.removeEventListener('keydown', onKeyDown, true);
  }, [api, container]);

  // The last pointer position in canvas coordinates, for placing notes.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const onPointerUpdate = useCallback(({ pointer: p }: { pointer: { x: number; y: number } }) => {
    pointer.current = p;
  }, []);

  useEffect(() => {
    const el = container.current;
    if (!el || !api || !editable) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey || typing(event.target))
        return;
      const state = api.getAppState();
      if (state.editingTextElement) return;
      event.preventDefault();
      const zoom = state.zoom.value || 1;
      const note = noteAt(
        pointer.current ?? { x: -state.scrollX + state.width / zoom / 2, y: -state.scrollY + state.height / zoom / 2 },
      );
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), ...note],
        appState: { selectedElementIds: { [note[0].id]: true } },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    };
    el.addEventListener('keydown', onKeyDown, true);
    return () => el.removeEventListener('keydown', onKeyDown, true);
  }, [api, container, editable]);

  return { controlsHidden, toggleControls, onPointerUpdate };
}
