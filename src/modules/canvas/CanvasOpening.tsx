import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { OPENING_STATUS_DELAY_MS, OPENING_WAIT_MS, openingReady, settledEmbeds } from './opening';

// Pages and fitted embeds share one presentation boundary. Hidden scenes still lay out
// and load their previews. Later file changes, panning, and theme updates stay visible.
export function useCanvasOpening(
  container: RefObject<HTMLDivElement | null>,
  api: ExcalidrawImperativeAPI | null,
  expectedIds: () => string[],
  loadingStartedAt?: number,
) {
  const expectedRef = useRef(expectedIds);
  expectedRef.current = expectedIds;
  const [revealed, setRevealed] = useState(false);
  const openingStatus = useOpeningStatus(loadingStartedAt, revealed);
  useEffect(() => {
    const root = container.current;
    if (!api || !root) return undefined;
    const started = Date.now();
    let expected: string[] | undefined;
    let finished = false;
    let second = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      window.clearTimeout(deadline);
      setRevealed(true);
    };
    const check = () => {
      if (expected && openingReady(expected, settledEmbeds(root), Date.now() - started)) finish();
    };
    const observer = new MutationObserver(check);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-preview-state', 'data-artifact-phase', 'role'],
    });
    const cameraPainted = () => {
      if (expected || finished) return;
      expected = expectedRef.current();
      check();
    };
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(cameraPainted);
    });
    // Hidden tabs may not run animation frames. The timer also bounds unsupported embeds.
    const cameraTimer = window.setTimeout(cameraPainted, 120);
    const deadline = window.setTimeout(finish, OPENING_WAIT_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(cameraTimer);
      window.clearTimeout(deadline);
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [api, container]);
  return { revealed, openingStatus };
}

export function CanvasOpeningSurface({ visible }: { visible: boolean }) {
  return (
    <div
      role='status'
      className='canvas-opening-surface absolute inset-0 flex items-center justify-center text-sm text-muted-foreground'
    >
      <span className={visible ? 'canvas-opening-shimmer' : 'sr-only'}>Opening canvas</span>
    </div>
  );
}

function useOpeningStatus(loadingStartedAt?: number, finished = false) {
  const started = useRef(loadingStartedAt ?? Date.now()).current;
  const [visible, setVisible] = useState(() => Date.now() - started >= OPENING_STATUS_DELAY_MS);
  useEffect(() => {
    if (finished || visible) return undefined;
    const timer = window.setTimeout(
      () => setVisible(true),
      Math.max(0, OPENING_STATUS_DELAY_MS - (Date.now() - started)),
    );
    return () => window.clearTimeout(timer);
  }, [started, finished, visible]);
  return visible;
}

export function CanvasEmbedPending({ loadingStartedAt }: { loadingStartedAt: number }) {
  const visible = useOpeningStatus(loadingStartedAt);
  return (
    <div className='canvas relative h-full bg-muted/30'>
      <CanvasOpeningSurface visible={visible} />
    </div>
  );
}
