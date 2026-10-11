// Where a canvas opens, and where each person left it (per browser, like Figma). The opening
// camera is worked out before Excalidraw's first paint, so the canvas doesn't draw at 100% and
// then jump.
import { useCallback, useEffect, useRef } from 'react';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 30; // Excalidraw's own limits
const SAVE_DELAY_MS = 400;

export const cameraKey = (file: string) => `design-studio:canvas-camera:${file}`;

type Camera = { scrollX: number; scrollY: number; zoom: { value: number } };
type Box = { x: number; y: number; width: number; height: number; isDeleted?: boolean };

// The saved camera, else the whole canvas fitted to the container (undefined if unknown).
export function initialCamera(
  elements: readonly Box[],
  key: string,
  container: HTMLElement | null,
): Camera | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    // A bad saved camera (zoom 0, a null scroll) would open the canvas blank every time.
    if (
      saved &&
      Number.isFinite(saved.scrollX) &&
      Number.isFinite(saved.scrollY) &&
      Number.isFinite(saved.zoom) &&
      saved.zoom >= MIN_ZOOM &&
      saved.zoom <= MAX_ZOOM
    ) {
      return { scrollX: saved.scrollX, scrollY: saved.scrollY, zoom: { value: saved.zoom } };
    }
  } catch {
    /* fit instead */
  }
  const live = elements.filter(el => !el.isDeleted);
  const rect = container?.getBoundingClientRect();
  if (!live.length || !rect?.width || !rect?.height) return undefined;
  const minX = Math.min(...live.map(el => el.x));
  const minY = Math.min(...live.map(el => el.y));
  const maxX = Math.max(...live.map(el => el.x + el.width));
  const maxY = Math.max(...live.map(el => el.y + el.height));
  const zoom = Math.min(
    1,
    Math.max(MIN_ZOOM, 0.9 * Math.min(rect.width / (maxX - minX || 1), rect.height / (maxY - minY || 1))),
  );
  return {
    scrollX: rect.width / (2 * zoom) - (minX + maxX) / 2,
    scrollY: rect.height / (2 * zoom) - (minY + maxY) / 2,
    zoom: { value: zoom },
  };
}

// An `onScrollChange` handler that remembers the camera, a moment after it stops moving.
export function useRememberCamera(key: string) {
  const timer = useRef(0);
  const pending = useRef<Camera | null>(null);
  const write = useCallback(() => {
    window.clearTimeout(timer.current);
    const camera = pending.current;
    pending.current = null;
    if (!camera) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ scrollX: camera.scrollX, scrollY: camera.scrollY, zoom: camera.zoom.value }),
      );
    } catch {
      /* storage full or off */
    }
  }, [key]);
  // Leaving within the delay still remembers where you were.
  useEffect(() => write, [write]);
  return useCallback(
    (scrollX: number, scrollY: number, zoom: { value: number }) => {
      window.clearTimeout(timer.current);
      pending.current = { scrollX, scrollY, zoom };
      timer.current = window.setTimeout(write, SAVE_DELAY_MS);
    },
    [write],
  );
}
