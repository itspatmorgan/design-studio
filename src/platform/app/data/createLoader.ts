// Loads the files of one file type (views, documents, ...) from a Vite glob. Each type calls
// this from its own loader.ts, with a glob of its extensions: Vite needs the pattern written
// out in that file. Vite only loads a file when it is asked for.
//
// Each loader file must also call import.meta.hot.accept() itself, at the bottom: Vite finds
// self-accepting files by reading their own source, so it can't be done in here. Without it, a
// new file reloads the whole page.
import { rootOf } from '@/platform/core/roots';

type Glob<M> = Record<string, () => Promise<M>>;

// A file in a prototype: its path in the prototype, like "checkout/step-1.tsx".
export type ItemFile = { contributor: string; prototype: string; path: string };

// In dev, adding or removing a file makes Vite run the loader file again with a new list. The
// app keeps calling the functions from the first run, so everything they read lives in one
// state object that Vite keeps across runs (import.meta.hot.data).
type State<M> = {
  glob: Glob<M>;
  // The browser keeps every module it imports, by URL, until the page reloads. Files get
  // moved and renamed in dev, so a path can hold different code over time. Importing with
  // a stamp that changes with the list makes the browser load the current file. (Vite's
  // hot reload does the same, and treats the stamped URL as the same module.)
  stamp: number;
  loaded: Map<string, Promise<M>>;
  waiting: (() => void)[];
  // Files that loaded without what the app needs (a view with no component yet, a document
  // that doesn't compile). When one changes, the router loads it again.
  incomplete: Set<string>;
};

// A file that doesn't compile fails to import with no reason. In dev, the server's reply to the
// same request says what's wrong (and where), so show that.
async function compileError(url: string, fallback: unknown) {
  try {
    const page = await (await fetch(url)).text();
    const json = page.match(/const error = (\{.*\})\s*\n/)?.[1];
    if (json) {
      const { message, frame } = JSON.parse(json) as { message?: string; frame?: string };
      return new Error([message, frame].filter(Boolean).join('\n\n'));
    }
  } catch {
    /* use the original error */
  }
  return fallback;
}

export function createLoader<M>(glob: Glob<M>, hot: ImportMeta['hot']) {
  const state: State<M> = hot?.data.state ?? {
    glob,
    stamp: Date.now(),
    loaded: new Map(),
    waiting: [],
    incomplete: new Set(),
  };
  const keyOf = ({ contributor, prototype, path }: ItemFile) => `/${rootOf(contributor, prototype)}/${path}`;

  // The importer for a file, or undefined.
  function find(file: ItemFile) {
    const key = keyOf(file);
    if (!state.glob[key]) return undefined;
    if (hot) return () => import(/* @vite-ignore */ `${key}?t=${state.stamp}`) as Promise<M>;
    return state.glob[key];
  }

  // In dev, resolves when the list next changes (or after a timeout).
  const nextList = (ms: number) =>
    new Promise<void>(resolve => {
      state.waiting.push(resolve);
      setTimeout(resolve, ms);
    });

  // One import per file, reused on every later visit. In dev, a file the app just created or
  // moved can be in the manifest a moment before Vite adds it here: pass inManifest to wait
  // for it briefly. An unknown address doesn't wait.
  async function load(file: ItemFile, { inManifest = false } = {}): Promise<M | undefined> {
    let importer = find(file);
    if (!importer && inManifest && hot) {
      await nextList(2000);
      importer = find(file);
    }
    if (!importer) return undefined;
    const key = keyOf(file);
    if (!state.loaded.has(key)) {
      const url = `${key}?t=${state.stamp}`;
      state.loaded.set(
        key,
        importer().catch(async error => {
          // Try again next time, from a new URL: the browser may remember a failed one.
          state.loaded.delete(key);
          state.stamp = Date.now();
          throw hot ? await compileError(url, error) : error;
        }),
      );
    }
    return state.loaded.get(key);
  }

  if (hot) {
    hot.data.state = state;
    // A later run, with a new list: take it, and wake anything waiting for it.
    if (state.glob !== glob) {
      state.glob = glob;
      state.stamp = Date.now();
      // Keep already-open, unchanged views stable when another file moves.
      for (const key of state.loaded.keys()) if (!(key in glob)) state.loaded.delete(key);
      state.waiting.splice(0).forEach(resolve => resolve());
      // A file that was incomplete reaches here once it's fixed: tell the router to load it
      // again (router.tsx).
      if (state.incomplete.size) {
        state.incomplete.clear();
        window.dispatchEvent(new Event('studio:views'));
      }
    }
    // A file that updates itself (a prototype document, src/platform/node/build/vite-markdown-refresh-plugin.js)
    // hands over its new version: use it, and have the router load the open item again. Added
    // once; it reads the shared state, so it stays current across runs.
    // Vite replaces custom listeners when this loader hot-updates, so register each run.
    hot.on('studio:relinked', ({ files }: { files: string[] }) => {
      // Non-refreshable rewritten modules reload through the route, never the document.
      const affected = files.filter(file => state.loaded.has(file));
      if (!affected.length) return;
      state.stamp = Date.now();
      affected.forEach(file => state.loaded.delete(file));
      window.dispatchEvent(new CustomEvent('studio:views', { detail: { files: affected } }));
    });
    if (!hot.data.listening) {
      hot.data.listening = true;
      window.addEventListener('studio:markdown', ((
        event: CustomEvent<{ key: string; mod: M; reference?: boolean }>,
      ) => {
        if (event.detail.reference || !(event.detail.key in state.glob)) return;
        state.loaded.set(event.detail.key, Promise.resolve(event.detail.mod));
        window.dispatchEvent(new CustomEvent('studio:views', { detail: { files: [event.detail.key] } }));
      }) as EventListener);
    }
  }

  return { load, incomplete: state.incomplete };
}
