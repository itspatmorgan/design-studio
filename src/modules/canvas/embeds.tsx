// How an item appears on a canvas. It's a stock Excalidraw `embeddable` element whose `link` is
// the item's address, so Excalidraw owns paste, drop, selection, move and resize. Excalidraw
// calls `renderEmbeddable` for each one, and that is where the link becomes a live preview (if
// the item's file type has an Embed), or a card (if it doesn't), or a "not found" card (if the
// link points at nothing). This file knows nothing about any file type: it asks the registry.
import { memo } from 'react';
import { embedFor } from '@/platform/app/data/fileTypeModule';
import { CaptureUpdateAction, newElementWith } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { FILE_TYPES, fileTypeModules } from '@/platform/app/data/fileTypes';
import { artifactLabel } from '@/platform/app/data/manifest';
import type { Manifest, Prototype } from '@/platform/app/data/types';
import ArtifactCard, { ITEM_CARD_HEIGHT } from '@/platform/app/artifacts/ArtifactCard';
import { appPathOf, isInPrototype, resolveArtifactPath } from '@/platform/app/artifacts/artifactLinks';

import EmbedFrame, { EMBED_HEADER_HEIGHT as HEADER_HEIGHT } from '@/platform/app/artifacts/EmbedFrame';
const BORDER = 2; // 1px each side
const DEFAULT_WIDTH = 480;
const DEFAULT_BODY_HEIGHT = Math.round((DEFAULT_WIDTH * 900) / 1440); // a 1440 x 900 screen, scaled

// Excalidraw's `validateEmbeddable`: only links into this app are embeds. Anything else (a
// video, a web page) isn't, so a canvas never loads another site.
export const validateEmbed = (link: string) => appPathOf(link) !== null;

// A canvas shows only items from its own prototype, so a prototype is all of its own: an item from
// another one doesn't resolve (and its spot says so: ArtifactCard).
const resolve = (manifest: Manifest, link: string | null, current: Prototype) => {
  const path = link && appPathOf(link);
  return path && isInPrototype(path, current) ? resolveArtifactPath(manifest, path) : null;
};
const elsewhere = (link: string | null, current: Prototype) => {
  const path = link && appPathOf(link);
  return Boolean(path && !isInPrototype(path, current));
};
const embedOf = (manifest: Manifest, link: string | null, current: Prototype) => {
  const target = resolve(manifest, link, current);
  return target
    ? embedFor(FILE_TYPES[target.item.fileType], fileTypeModules[target.item.fileType], 'canvas', 'prototype')
    : undefined;
};

// The size of a new embed: a preview is a screen, a card is a compact row.
function defaultSize(manifest: Manifest, link: string | null, current: Prototype) {
  return {
    width: DEFAULT_WIDTH,
    height: embedOf(manifest, link, current) ? HEADER_HEIGHT + BORDER + DEFAULT_BODY_HEIGHT : ITEM_CARD_HEIGHT,
  };
}

const isItem = (el: ExcalidrawElement) =>
  el.type === 'embeddable' && !el.isDeleted && el.link != null && appPathOf(el.link) !== null;

// Rules for items on a canvas (they're `embeddable` elements, but act like frames, not shapes):
// sized like a screen (or a card) when first inserted instead of Excalidraw's video-box default,
// no Excalidraw outline (the shared rounded frame draws its own border), and
// no link icon (the title bar is the link).
// Kept out of undo history: undo must reverse only what the person did.
export function normalizeEmbeds(
  api: ExcalidrawImperativeAPI,
  elements: readonly ExcalidrawElement[],
  manifest: Manifest,
  current: Prototype,
) {
  const pending = elements.filter(
    el =>
      isItem(el) &&
      (!el.customData?.frame || el.roundness || el.strokeColor !== 'transparent' || !el.customData?.hideLinkIcon),
  );
  if (!pending.length) return;
  const ids = new Set(pending.map(el => el.id));
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map(el => {
      if (!ids.has(el.id)) return el;
      const size = defaultSize(manifest, el.type === 'embeddable' ? el.link : null, current);
      const placed = el.customData?.frame ? {} : { ...size, x: el.x - size.width / 2, y: el.y - size.height / 2 };
      // hideLinkIcon is read by our Excalidraw patch (patches/README.md).
      return newElementWith(el, {
        ...placed,
        roundness: null,
        strokeColor: 'transparent',
        customData: { ...el.customData, frame: true, hideLinkIcon: true },
      });
    }),
    captureUpdate: CaptureUpdateAction.NEVER,
  });
}

// True when every selected element is an item (they aren't styleable, so the style panel hides).
export function onlyItemsSelected(elements: readonly ExcalidrawElement[], appState: AppState) {
  const ids = Object.keys(appState.selectedElementIds);
  if (!ids.length) return false;
  const byId = new Map(elements.map(el => [el.id, el]));
  return ids.every(id => byId.get(id) && isItem(byId.get(id)!));
}

const CULL_MARGIN_PX = 400;
// Below this zoom a live preview is unreadable: show the item's name instead.
const OVERVIEW_ZOOM = 0.12;

// Whether an element is far off screen, and whether the canvas is zoomed out too far to read it.
// Flips only at the edges, so a still canvas doesn't re-render.
export function renderFlags(element: ExcalidrawElement, appState: AppState, marginPx = CULL_MARGIN_PX) {
  const zoom = appState.zoom.value || 1;
  const margin = marginPx / zoom;
  const left = -appState.scrollX - margin;
  const top = -appState.scrollY - margin;
  const right = -appState.scrollX + appState.width / zoom + margin;
  const bottom = -appState.scrollY + appState.height / zoom + margin;
  const offscreen =
    element.x > right || element.x + element.width < left || element.y > bottom || element.y + element.height < top;
  return { offscreen, overview: zoom < OVERVIEW_ZOOM };
}

// Opening waits for the initial viewport, not the preloading margin or distant views.
export function openingEmbedIds(
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  manifest: Manifest,
  current: Prototype,
  overviewCards = true,
) {
  return elements
    .filter(element => {
      const { offscreen, overview } = renderFlags(element, appState, 0);
      return (
        isItem(element) &&
        !offscreen &&
        !(overview && overviewCards) &&
        Boolean(embedOf(manifest, element.type === 'embeddable' ? element.link : null, current))
      );
    })
    .map(element => element.id);
}

type ItemProps = {
  element: ExcalidrawElement;
  manifest: Manifest;
  current: Prototype;
  offscreen: boolean;
  overview: boolean;
  // Has been near the viewport, so its preview is live. Before that it's a sized placeholder.
  mounted: boolean;
};

function CanvasItemInner({ element, manifest, current, offscreen, overview, mounted }: ItemProps) {
  const link = element.type === 'embeddable' ? element.link : null;
  const target = resolve(manifest, link, current);
  const Embed =
    target && embedFor(FILE_TYPES[target.item.fileType], fileTypeModules[target.item.fileType], 'canvas', 'prototype');
  // A card fills the element. A missing one is a card too, and so is one from another prototype.
  if (!target || !Embed)
    return (
      <div data-canvas-frame='' className='h-full w-full'>
        <ArtifactCard proto={target?.proto} item={target?.item} elsewhere={elsewhere(link, current)} />
      </div>
    );
  const { proto, item } = target;
  const hidden = offscreen || overview;
  return (
    <EmbedFrame proto={proto} item={item} className='h-full w-full'>
      {/* Hidden means mounted but skipped for layout and paint (far off screen, or too small to
          read), so the live preview never reloads or jumps. */}
      <div
        inert
        data-canvas-embed-id={element.id}
        className='min-h-0 flex-1'
        style={hidden ? { visibility: 'hidden', contentVisibility: 'hidden' } : undefined}
      >
        {mounted ? (
          <Embed
            proto={proto}
            item={item}
            width={element.width - BORDER}
            height={element.height - HEADER_HEIGHT - BORDER}
          />
        ) : (
          <div className='h-full bg-muted/50' />
        )}
      </div>
      {overview && !offscreen && (
        <div className='canvas-overview'>
          <span>{artifactLabel(item.path)}</span>
        </div>
      )}
    </EmbedFrame>
  );
}

// Excalidraw calls `renderEmbeddable` on every render, including each pan and zoom frame.
// Without this, every live preview re-rendered per frame. It re-renders only when this element's
// own data changes.
export const CanvasItem = memo(
  CanvasItemInner,
  (a, b) =>
    a.manifest === b.manifest &&
    a.current === b.current &&
    a.element.id === b.element.id &&
    a.element.version === b.element.version &&
    a.offscreen === b.offscreen &&
    a.overview === b.overview &&
    a.mounted === b.mounted,
);
