import { CONFIG } from './config';
import { SYSTEM_SPECS } from '@/modules/systems/data/systems';
import { SourceChanged } from '@/platform/core/source/access';
// A prototype's files, from the dev server (src/platform/node/build/vite-files-plugin.js). Dev only: on the
// deployed site these return null, and the prototype navigation lists views from the manifest.
import { useEffect, useState } from 'react';
import type { Manifest, Prototype, PrototypeInfo } from '@/platform/app/data/types';
import { SYSTEMS_KEY, rootOf } from '@/platform/core/roots';
import { MODULES } from '@/platform/app/data/modules';
import { canOwn, policyFor, canPerform, pathResource } from '@/platform/core/permissions';
import type { Status } from '@/platform/core/archive';
import { toast } from '@/systems/studio/components/toast';

export type FileNode = { name: string; path: string; dir: boolean; children?: FileNode[] };

const key = (p: PrototypeInfo) => `${p.contributorKey}/${p.id}`;

// This tab, sent with every change, so the manifest update it causes isn't applied twice
// (router.tsx): the tab that made the change applies it from the reply, in order.
export const TAB_ID = Math.random().toString(36).slice(2);

async function fetchFiles(p: PrototypeInfo): Promise<FileNode[] | null> {
  const res = await fetch(
    `/__studio/files?contributor=${encodeURIComponent(p.contributorKey)}&prototype=${encodeURIComponent(p.id)}`,
  );
  return res.ok ? ((await res.json()) as { files: FileNode[] }).files : null;
}

// The prototype's file tree, refreshed whenever its files are added or removed.
// reload() refreshes it right away, after the app changes a file itself.
export function useFileTree(proto: PrototypeInfo) {
  const [files, setFiles] = useState<FileNode[] | null>(null);
  const [reload, setReload] = useState(() => () => {});
  useEffect(() => {
    if (!import.meta.hot) return;
    let live = true;
    const load = () =>
      fetchFiles(proto)
        .then(f => {
          if (live) setFiles(f);
        })
        .catch(() => {});
    setReload(() => load);
    load();
    const onChange = (changed: string[]) => {
      if (changed.includes(key(proto))) load();
    };
    import.meta.hot.on('studio:files', onChange);
    return () => {
      live = false;
      import.meta.hot?.off('studio:files', onChange);
    };
  }, [proto.contributorKey, proto.id]);
  return { files, reload };
}

// The file's path from the repo root, like src/prototypes/patrick/hello-world/meta.json (the
// prototype's folder for an empty `file`).
export const repoPath = (p: PrototypeInfo, file: string) =>
  `src/${rootOf(p.contributorKey, p.id)}${file ? `/${file}` : ''}`;

// Every entry point gets the same checked response and visible fallback/failure.
export async function openRepositoryFile(path: string) {
  try {
    const res = await fetch('/__studio/editor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Couldn't open this file. Use Edit source or copy its path.");
    if (!body.opened) toast.add({ title: body.message });
  } catch (error) {
    toast.add({ type: 'error', title: error instanceof Error ? error.message : "Couldn't open this file." });
  }
}

export function openInEditor(p: PrototypeInfo, file: string) {
  return openRepositoryFile(repoPath(p, file));
}

// Shows a file in Finder (or your system's file browser).
export async function revealInFinder(p: PrototypeInfo, file: string) {
  try {
    const res = await fetch('/__studio/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contributor: p.contributorKey, prototype: p.id, path: file }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Couldn't show this file in Finder.");
  } catch (error) {
    toast.add({ type: 'error', title: error instanceof Error ? error.message : "Couldn't show this file in Finder." });
  }
}

// Canvas loads identity before mounting, avoiding a read-only toolbar flash.
export const preloadIdentity = () =>
  (meRequest ??= fetch('/__studio/me')
    .then(r => {
      if (!r.ok) throw new Error('Identity unavailable');
      return r.json() as Promise<Who>;
    })
    .catch(() => ({ key: null, name: null }))
    .then(who => {
      resolvedWho = who;
      return who;
    }));

// Who you are, from the dev server: your contributor key and name, both null on the deployed site or if
// you're not a contributor. The name is undefined while the dev server hasn't answered yet.
type Who = { key: string | null; name: string | null | undefined };
let meRequest: Promise<Who> | undefined;
let resolvedWho: Who | undefined;
const identityListeners = new Set<() => void>();
if (import.meta.hot) {
  const changed = () => {
    meRequest = undefined;
    resolvedWho = undefined;
    identityListeners.forEach(reload => reload());
  };
  import.meta.hot.on('studio:identity', changed);
  import.meta.hot.dispose(() => import.meta.hot?.off('studio:identity', changed));
}
function useWho(): Who {
  const [who, setWho] = useState<Who>(() => resolvedWho ?? { key: null, name: import.meta.hot ? undefined : null });
  useEffect(() => {
    if (!import.meta.hot) return;
    let live = true;
    const reload = () => {
      const request = preloadIdentity();
      void request.then(next => {
        if (live && request === meRequest) setWho(next);
      });
    };
    identityListeners.add(reload);
    reload();
    return () => {
      live = false;
      identityListeners.delete(reload);
    };
  }, []);
  return who;
}

// Your contributor key. The app lets you change files only in your own prototypes.
export const useMe = () => useWho().key;
// Your name, as their profile declares it; undefined until the dev server has answered.
export const useMyName = () => useWho().name;

// Whether you own a prototype (so you may archive or delete it): your own, or a section item you maintain. The
// policy of its section decides (src/platform/core/permissions.ts); the dev server checks again on every change.
export const canEditSource = (path: string, me: string | null) =>
  canPerform(CONFIG, me, me ? [me] : [], pathResource(path, SYSTEM_SPECS), 'edit');
const subject = (p: PrototypeInfo, me: string | null) => ({ me, key: p.contributorKey, maintainers: p.maintainers });
const policyOf = (p: PrototypeInfo) => policyFor(p.contributorKey, MODULES);
export const ownsPrototype = (p: PrototypeInfo, me: string | null) =>
  policyOf(p) !== 'open' &&
  (canOwn(policyOf(p), subject(p, me)) || canPerform(CONFIG, me, me ? [me] : [], { kind: 'platform' }, 'edit'));
// Shared source requires resource grants in addition to artifact ownership.
export const canChangePrototype = (p: PrototypeInfo, me: string | null) =>
  canOwn(policyOf(p), subject(p, me)) || canEditSource('src/' + rootOf(p.contributorKey, p.id), me);

export type FileOp =
  | { op: 'create'; path: string; name: string; dir?: boolean }
  | { op: 'rename'; path: string; name: string }
  | { op: 'move'; path: string; to: string }
  | { op: 'delete'; path: string }
  // Put a file or folder before another in its folder (`before` empty: last), moving it to folder `to` first if that's elsewhere.
  | { op: 'reorder'; path: string; to?: string; before?: string }
  | { op: 'meta'; title?: string; status?: Status }
  // A system content skill: skills/<name>/SKILL.md, in the Agent Skills format.
  | { op: 'create-skill'; name: string; description: string }
  // A prototype system's components: the examples and page one is missing.
  | { op: 'add-docs'; component: string };

export type FileOpResult = { path?: string; trashedTo?: string; relinkedFiles?: string[]; manifest: Manifest };

// A prototype system's components folder, in the shape the file layer takes for a prototype
// (src/platform/core/roots.ts): what the Source view and the operations above are given.
export const systemFiles = (system: string): Prototype => ({
  id: system,
  contributorKey: SYSTEMS_KEY,
  title: system,
  description: '',
  contributor: '',
  created: null,
  system,
  artifacts: [],
});

// Changes a file in your prototype (src/platform/node/build/vite-files-plugin.js). Throws the server's message.
export async function fileOp(p: PrototypeInfo, op: FileOp): Promise<FileOpResult> {
  const res = await fetch('/__studio/op', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Studio-Tab': TAB_ID },
    body: JSON.stringify({ contributor: p.contributorKey, prototype: p.id, ...op }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Check that the dev server is still running.');
  return body;
}

// An item file's text and its version (a hash), for the Source view. Any prototype's, so other
// people's can be read. Throws the server's message.
export async function readSource(p: PrototypeInfo, path: string) {
  const query = new URLSearchParams({ contributor: p.contributorKey, prototype: p.id, path });
  const res = await fetch(`/__studio/file?${query}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Check that the dev server is still running.');
  return body as { content: string; version: string };
}

// Switches an item in your prototype to lofi or back, by changing the marker in its file the way its
// type says (fidelity in its type.ts). The manifest follows from the file changing, like any edit.
export async function setArtifactLofi(
  p: PrototypeInfo,
  path: string,
  on: boolean,
  fidelity: { setLofi(source: string, on: boolean): string },
) {
  const { content, version } = await readSource(p, path);
  const next = fidelity.setLofi(content, on);
  if (next !== content) await writeSource(p, path, next, version);
}

// The file changed on disk since it was read (its version isn't `base` any more).

// Saves an item file in your prototype. `base` is the version you read or last saved.
export async function writeSource(p: PrototypeInfo, path: string, content: string, base: string) {
  const res = await fetch('/__studio/write', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contributor: p.contributorKey, prototype: p.id, path, content, base }),
  });
  const body = await res.json();
  if (res.status === 409) throw new SourceChanged(body.error);
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Check that the dev server is still running.');
  // `warnings` are problems with the file's format that the save didn't block (a skill's SKILL.md).
  return body as { version: string; warnings?: string[] };
}

// Creates a prototype in your folder, like pnpm new. Returns its URL parts and the new manifest.
export async function createPrototype(title: string, system?: string | null) {
  const res = await fetch('/__studio/prototype', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Studio-Tab': TAB_ID },
    body: JSON.stringify({ title, system }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Check that the dev server is still running.');
  return body as { contributor: string; prototype: string; manifest: Manifest };
}

// Copies an owned prototype; a different target system records an agent rebuild request.
export async function duplicatePrototype(p: PrototypeInfo, change: { title: string; system: string | null }) {
  const res = await fetch('/__studio/prototype-duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Studio-Tab': TAB_ID },
    body: JSON.stringify({ contributor: p.contributorKey, prototype: p.id, ...change }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Could not duplicate this prototype.');
  return body as { prototype: string; manifest: Manifest };
}

// Renames the title and folder. The reply includes the new URL id.
export async function renamePrototype(p: PrototypeInfo, change: { title: string }) {
  const res = await fetch('/__studio/prototype-rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Studio-Tab': TAB_ID },
    body: JSON.stringify({ contributor: p.contributorKey, prototype: p.id, ...change }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Check that the dev server is still running.');
  return body as { prototype: string; manifest: Manifest };
}

// Moves a prototype you own to the Trash. Returns where it went and the new manifest.
export async function deletePrototype(p: PrototypeInfo) {
  const res = await fetch('/__studio/prototype-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Studio-Tab': TAB_ID },
    body: JSON.stringify({ contributor: p.contributorKey, prototype: p.id }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Check that the dev server is still running.');
  return body as { trashedTo: string; manifest: Manifest };
}

// Calls a route a module adds to the dev server (its server.ts, src/platform/core/modules/index.ts): POST /__studio/<module>/<route>.
// Resolves with the server's reply, or throws its message.
export async function callModule<T>(module: string, route: string, body: object): Promise<T> {
  const res = await fetch(`/__studio/${module}/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Studio-Tab': TAB_ID },
    body: JSON.stringify(body),
  });
  const reply = await res.json();
  if (!res.ok) throw new Error(reply.error ?? 'Something went wrong. Check that the dev server is still running.');
  return reply as T;
}
