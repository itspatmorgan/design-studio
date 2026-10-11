import { SourceChanged } from '@/platform/core/source/access';
// A canvas's file while it's open: saves edits, and takes in changes made to the file from
// outside (your agent editing it, or another tab). The file is the source of truth.
//
// Saving (dev only, and only in your own prototypes) goes through the same file layer as the
// Source view: each save says which version of the file it builds on, and is refused if the file
// has changed since. It is then merged with the newer file and tried again.
//   - An edit saves after a quiet moment (or every few seconds during a long run of edits).
//   - One save at a time. A failed save tries again, waiting longer each time.
//   - Leaving the canvas, or hiding the tab, saves what is unsaved right away.
//   - The scene Excalidraw hands back right after load is the file itself, not an edit, and so is
//     a change taken in from the file: both are recognized by their scene version.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { CaptureUpdateAction, getSceneVersion, restoreElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { readSource, writeSource } from '@/platform/app/data/files';
import type { Artifact, Prototype } from '@/platform/app/data/types';
import { toast } from '@/platform/systems/studio/components/toast';
import { parseCanvas, serializeCanvas } from './format';
import { mergeRemote } from './mergeRemote';

const SAVE_DEBOUNCE_MS = 1200;
const SAVE_MAX_WAIT_MS = 5000;
const MAX_CONFLICTS = 3;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;

// The file as this canvas last read or wrote it.
type Disk = { content: string; version: string; ids: Set<string> };
type Snapshot = { elements: readonly ExcalidrawElement[]; appState: AppState };

const idsOf = (elements: readonly { id: string; isDeleted?: boolean }[]) =>
  new Set(elements.filter(el => !el.isDeleted).map(el => el.id));

export function useCanvasFile({
  proto,
  item,
  api,
  initial,
  editable,
}: {
  proto: Prototype;
  item: Artifact;
  api: ExcalidrawImperativeAPI | null;
  // The file as loaded: its text, version, the elements Excalidraw starts with, and their scene version.
  initial: { text: string; version: string; elements: readonly ExcalidrawElement[]; sceneVersion: number };
  editable: boolean;
}) {
  const disk = useRef<Disk>({ content: initial.text, version: initial.version, ids: idsOf(initial.elements) });
  const known = useRef(initial.sceneVersion); // the scene version already saved, or taken from the file
  const latest = useRef<Snapshot | null>(null);
  const dirty = useRef(false);
  const saving = useRef(false);
  const inflight = useRef<string | null>(null); // the text being written, to recognize our own save coming back
  const burst = useRef(0); // when the first unsaved edit of the current run happened
  const conflicts = useRef(0);
  const failures = useRef(0);
  const timer = useRef(0);
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving' | 'failed'>('saved');
  const paused = useRef(false);
  const apiRef = useRef(api);
  apiRef.current = api;
  const editableRef = useRef(editable);
  editableRef.current = editable;

  const schedule = useCallback((delay?: number) => {
    window.clearTimeout(timer.current);
    const wait = delay ?? Math.max(0, Math.min(SAVE_DEBOUNCE_MS, SAVE_MAX_WAIT_MS - (Date.now() - burst.current)));
    timer.current = window.setTimeout(() => saveRef.current(), wait);
  }, []);

  // Takes a newer version of the file into the scene. With unsaved edits it's merged with them;
  // without, the file just replaces the scene.
  const takeFile = useCallback(
    (next: { content: string; version: string }) => {
      const a = apiRef.current;
      if (!a) return false;
      let parsed;
      try {
        parsed = parseCanvas(next.content);
      } catch {
        return false;
      } // half written, or not a canvas: wait for the next change
      const remote = restoreElements(parsed.elements as never, null, {
        refreshDimensions: true,
      }) as ExcalidrawElement[];
      let elements = remote;
      let needsWriteBack = false;
      if (dirty.current || saving.current)
        ({ elements, needsWriteBack } = mergeRemote(
          a.getSceneElementsIncludingDeleted() as ExcalidrawElement[],
          remote,
          disk.current.ids,
          a.getAppState(),
        ));
      disk.current = { content: next.content, version: next.version, ids: idsOf(remote) };
      try {
        a.updateScene({
          elements,
          appState: { viewBackgroundColor: parsed.background },
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        known.current = getSceneVersion(a.getSceneElementsIncludingDeleted());
      } catch {
        return false;
      } // the canvas was closed meanwhile
      if (needsWriteBack) {
        dirty.current = true;
        if (!paused.current) {
          setSaveState('unsaved');
          schedule();
        }
      }
      return true;
    },
    [schedule],
  );

  const save = async () => {
    window.clearTimeout(timer.current);
    const snap = latest.current;
    if (saving.current || !dirty.current || !editableRef.current || !snap) return;
    const content = serializeCanvas(snap.elements, snap.appState, parseCanvas(disk.current.content).studioId);
    if (content === disk.current.content) {
      dirty.current = false;
      burst.current = 0;
      setSaveState('saved');
      return;
    }
    saving.current = true;
    dirty.current = false; // an edit during the save sets it again
    burst.current = 0;
    inflight.current = content;
    setSaveState('saving');
    let retryIn: number | null = null;
    try {
      const { version } = await writeSource(proto, item.path, content, disk.current.version);
      disk.current = { content, version, ids: idsOf(snap.elements) };
      conflicts.current = 0;
      failures.current = 0;
      paused.current = false;
      setSaveState(dirty.current ? 'unsaved' : 'saved');
    } catch (error) {
      dirty.current = true;
      setSaveState('failed');
      if (error instanceof SourceChanged) {
        // The file changed since we read it: merge the newer one in, then save the union.
        if (++conflicts.current <= MAX_CONFLICTS) {
          const next = await readSource(proto, item.path).catch(() => null);
          if (next) takeFile(next);
          retryIn = 300 + Math.random() * 300;
        } else {
          paused.current = true;
          toast.add({ type: 'error', title: "Couldn't save: the file keeps changing." });
        }
      } else {
        if (++failures.current === 1) toast.add({ type: 'error', title: "Couldn't save this canvas. Trying again." });
        retryIn = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (failures.current - 1));
      }
    } finally {
      saving.current = false;
      inflight.current = null;
    }
    if (retryIn !== null) schedule(retryIn);
    else if (dirty.current && !paused.current) schedule();
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  // Excalidraw's onChange, which also reports selection and camera changes: only a change in the
  // elements is an edit.
  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      latest.current = { elements, appState };
      if (!editableRef.current) return;
      const version = getSceneVersion(elements);
      if (version === known.current) return;
      known.current = version;
      dirty.current = true;
      setSaveState('unsaved');
      if (!burst.current) burst.current = Date.now();
      if (!paused.current) schedule();
    },
    [schedule],
  );

  // Writes what's unsaved now, and resolves whether nothing is left (for the agent's `persist`).
  const persist = useCallback(async () => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (!dirty.current && !saving.current) return true;
      if (paused.current) return false;
      if (editableRef.current && !saving.current) {
        await saveRef.current();
        if (dirty.current) return false;
      } else await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }, []);

  // Navigation offers a choice if saving fails; browser reload/close warns while a write is pending.
  const blocker = useBlocker({
    shouldBlockFn: async () => (dirty.current || saving.current) && !(await persist()),
    enableBeforeUnload: () => dirty.current || saving.current,
    withResolver: true,
  });

  const retry = useCallback(() => {
    paused.current = false;
    conflicts.current = 0;
    void saveRef.current();
  }, []);

  const discard = useCallback(() => {
    dirty.current = false;
    paused.current = true;
    window.clearTimeout(timer.current);
  }, []);

  // The file changed on disk. Our own saves come back here too, and are recognized.
  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) return undefined;
    const onFile = async (change: { contributor: string; prototype: string; path: string }) => {
      if (change.contributor !== proto.contributorKey || change.prototype !== proto.id || change.path !== item.path)
        return;
      const next = await readSource(proto, item.path).catch(() => null);
      if (!next || next.version === disk.current.version || next.content === inflight.current) return;
      takeFile(next);
    };
    hot.on('studio:file', onFile);
    return () => hot.off?.('studio:file', onFile);
  }, [proto, item.path, takeFile]);

  // Leaving, or hiding the tab, saves what's unsaved right away.
  useEffect(() => {
    const flush = () => {
      if (dirty.current && !saving.current && !paused.current) void saveRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer.current);
      flush();
    };
  }, []);

  return { onChange, persist, saveState, blocker, retry, discard };
}
