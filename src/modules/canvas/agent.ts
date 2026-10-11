import { embedFor } from '@/platform/app/data/fileTypeModule';
// The canvas tools in the open canvas: `window.__studioCanvas`, for an agent that has a browser. Dev
// only. They are the tools in tools.ts (the command line runs the same ones on the file), applied to
// the scene on screen, so the person sees each change as it is made and can undo it with ⌘Z: one
// tool call is one undo step. Edits save the way the person's do (useCanvasFile.ts).
//
//   const c = window.__studioCanvas
//   c.help()                        the tools, with examples
//   c.context()                     what the person has selected and is looking at
//   c.describe({ scope: 'selection' })
//   await c.create({ elements: [{ type: 'note', text: 'Check this', color: 'pink' }] })
//   c.point({ ids: [id] })          select it and scroll to it, so the person sees which one you mean
import { CaptureUpdateAction, exportToBlob, restoreElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { FILE_TYPES, fileTypeModules } from '@/platform/app/data/fileTypes';
import { artifactLabel } from '@/platform/app/data/manifest';
import type { Artifact, Manifest, Prototype } from '@/platform/app/data/types';
import { appPathOf, isInPrototype, resolveArtifactPath, artifactPath } from '@/platform/app/artifacts/artifactLinks';
import { prototypeAddress, resourceId } from '@/platform/core/fileTypes';
import { boundsOf } from './elements';
import { help, run, ToolError, type Ctx, type El, type ArtifactInfo } from './tools';

export type CanvasAgentOptions = {
  api: ExcalidrawImperativeAPI;
  proto: Prototype;
  item: Artifact;
  // The manifest as it is now (it changes as files do).
  manifest: () => Manifest;
  // Whether this canvas can be changed: not in someone else's prototype.
  editable: () => boolean;
  // Writes the canvas file now; resolves whether nothing is left unsaved.
  persist: () => Promise<boolean>;
};

export function createCanvasAgent({ api, proto, item, manifest, editable, persist }: CanvasAgentOptions) {
  const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}`;
  const origin = window.location.origin;
  const file = `src/prototypes/${proto.contributorKey}/${proto.id}/${item.path}`;

  const ctx: Ctx = {
    base: prototypeAddress(resourceId(proto.studioId)),
    artifact(path) {
      // A canvas shows only its own prototype's items.
      if (!isInPrototype(path, proto)) return null;
      const found = resolveArtifactPath(manifest(), path);
      if (!found) return null;
      const type = found.item.fileType;
      return {
        path,
        sourcePath: found.item.path,
        title: artifactLabel(found.item.path),
        type,
        typeLabel: FILE_TYPES[type]?.label ?? 'File',
        preview: Boolean(embedFor(FILE_TYPES[type], fileTypeModules[type], 'canvas', 'prototype')),
      };
    },
    artifacts() {
      const own = [...manifest().prototypes, ...Object.values(manifest().sections).flat()].find(
        p => p.contributorKey === proto.contributorKey && p.id === proto.id,
      );
      return (own?.artifacts ?? proto.artifacts)
        .map(i => ctx.artifact(artifactPath(proto, i)) as ArtifactInfo)
        .filter(Boolean);
    },
    linkPath: appPathOf,
  };

  // Excalidraw wants whole URLs in links; the tools deal in app paths.
  const withOrigin = (el: El): El =>
    typeof el.link === 'string' && el.link.startsWith('/') && !el.link.startsWith('//')
      ? { ...el, link: `${origin}${base}${el.link}` }
      : el;

  const scene = () => api.getSceneElementsIncludingDeleted() as unknown as El[];

  // What is on the person's screen, in canvas coordinates.
  const viewport = () => {
    const s = api.getAppState();
    const zoom = s.zoom.value || 1;
    return {
      x: Math.round(-s.scrollX),
      y: Math.round(-s.scrollY),
      width: Math.round(s.width / zoom),
      height: Math.round(s.height / zoom),
      zoom: Math.round(zoom * 100) / 100,
    };
  };
  const inView = (el: El) => {
    const v = viewport();
    const b = boundsOf(el);
    return b.x < v.x + v.width && b.x + b.width > v.x && b.y < v.y + v.height && b.y + b.height > v.y;
  };
  const selected = () => Object.keys(api.getAppState().selectedElementIds);

  function call(tool: string, args: unknown) {
    if (!['describe', 'help', 'artifacts'].includes(tool) && !editable()) {
      throw new ToolError(
        "This canvas is read-only here: it is in someone else's prototype, or the app is not running in dev. Ask the person to make a canvas of your own.",
      );
    }
    let input = args as Record<string, unknown> | undefined;
    // Scopes that need the screen, turned into ids.
    if (tool === 'describe' && input?.scope && input.scope !== 'all') {
      const live = scene().filter(el => !el.isDeleted);
      if (input.scope === 'selection') input = { ...input, ids: selected() };
      else if (input.scope === 'view')
        input = { ...input, ids: live.filter(el => !el.containerId && inView(el)).map(el => el.id) };
      else throw new ToolError('scope must be "all", "selection", or "view"');
    }
    const before = scene();
    const { elements, result, touched } = run(before, tool, input, ctx);
    if (touched.length) {
      // Measure text properly (the tools estimate it), and give links their whole URLs.
      const changed = new Set(touched);
      const measured = new Map(
        (
          restoreElements(
            elements.filter(el => changed.has(el.id)).map(withOrigin) as unknown as ExcalidrawElement[],
            null,
            { refreshDimensions: true, repairBindings: false },
          ) as unknown as El[]
        ).map(el => [el.id, el]),
      );
      api.updateScene({
        elements: elements.map(el => measured.get(el.id) ?? el) as unknown as ExcalidrawElement[],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      // Bring new things into view, unless they already are.
      const made = (result as { created?: string[] }).created;
      if (made?.length) {
        const fresh = api.getSceneElements().filter(el => made.includes(el.id));
        if (fresh.length && !fresh.some(el => inView(el as unknown as El)))
          api.scrollToContent(fresh, {
            fitToViewport: true,
            viewportZoomFactor: 0.9,
            maxZoom: api.getAppState().zoom.value,
            animate: true,
          });
      }
    }
    return result;
  }

  return {
    help: (tool?: string) => help(tool),

    context() {
      const ids = selected();
      const live = scene().filter(el => !el.isDeleted && !el.containerId);
      return {
        canvas: file,
        editable: editable(),
        selection: ids,
        viewport: viewport(),
        elements: live.length,
        // Ids of what is on the person's screen, so "here" can be answered without describing everything.
        inView: live.filter(inView).map(el => el.id),
      };
    },

    describe: (args?: unknown) => call('describe', args),
    artifacts: (args?: unknown) => call('artifacts', args),
    create: (args: unknown) => call('create', args),
    update: (args: unknown) => call('update', args),
    move: (args: unknown) => call('move', args),
    delete: (args: unknown) => call('delete', args),

    point(args: { ids?: string[] }) {
      const ids = args?.ids;
      if (!Array.isArray(ids) || !ids.length)
        throw new ToolError('point needs the `ids` of what to show. Use describe to see ids');
      const els = (api.getSceneElements() as unknown as El[]).filter(
        el => ids.includes(el.id) || (el.containerId && ids.includes(el.containerId)),
      );
      if (!els.length) throw new ToolError(`no elements with ids ${ids.join(', ')}`);
      api.updateScene({
        appState: { selectedElementIds: Object.fromEntries(ids.map(id => [id, true])) },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      // Never zooms in: a small thing is centered, a big one fits.
      api.scrollToContent(els as unknown as ExcalidrawElement[], {
        fitToViewport: true,
        viewportZoomFactor: 0.8,
        maxZoom: api.getAppState().zoom.value,
        animate: true,
      });
      return { ok: true, pointed: ids };
    },

    async screenshot({ ids, scale = 1 }: { ids?: string[]; scale?: number } = {}) {
      const exportScale = Number.isFinite(scale) ? Math.min(4, Math.max(0.1, scale)) : 1; // a huge scale crashes the tab
      const all = api.getSceneElements() as unknown as El[];
      const pick = ids?.length ? new Set(ids) : null;
      const elements = (pick
        ? all.filter(
            el =>
              pick.has(el.id) || (el.frameId && pick.has(el.frameId)) || (el.containerId && pick.has(el.containerId)),
          )
        : all) as unknown as ExcalidrawElement[];
      const blob = await exportToBlob({
        elements,
        appState: { ...api.getAppState(), exportBackground: true, exportScale },
        files: api.getFiles(),
        mimeType: 'image/png',
        exportPadding: 40,
      });
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('could not read the screenshot'));
        reader.readAsDataURL(blob);
      });
    },

    // Writes the file now (edits also save on their own a moment after they stop).
    async persist() {
      const saved = await persist();
      return saved
        ? { ok: true, file }
        : { ok: false, error: 'not saved: this canvas is read-only, or its file could not be written' };
    },
  };
}
