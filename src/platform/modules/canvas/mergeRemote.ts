// Merging a canvas saved by someone else (an agent, or another tab) into the one open here.
// Used when this canvas has edits that aren't saved yet; with none, the file simply replaces the scene.
import { newElementWith, reconcileElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState } from '@excalidraw/excalidraw/types';

// Elements are matched by id and the newer version of each wins (Excalidraw's own rules). The
// file holds only live elements, so an element missing from it might be one deleted there or
// one only we have: `lastIds` (the ids in the file as we last knew it) tells them apart. A
// missing one that we last saw in the file was deleted there; one we didn't is ours and is kept.
export function mergeRemote(
  local: readonly ExcalidrawElement[],
  remote: readonly ExcalidrawElement[],
  lastIds: ReadonlySet<string>,
  appState: AppState,
) {
  const remoteIds = new Set(remote.map(el => el.id));
  const deletedThere = new Set([...lastIds].filter(id => !remoteIds.has(id)));
  const marked = local.map(el =>
    !el.isDeleted && deletedThere.has(el.id) ? newElementWith(el, { isDeleted: true }) : el,
  );
  const elements = reconcileElements(marked as never, remote as never, appState) as ExcalidrawElement[];
  // Elements we hold that the file lacks: save the union.
  const needsWriteBack = elements.some(el => !el.isDeleted && !remoteIds.has(el.id));
  return { elements, needsWriteBack };
}
