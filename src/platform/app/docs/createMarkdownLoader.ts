// Manual and owner references use the same live Markdown handoff as artifact readers.
// Keep original callers current when Vite replaces a glob or a Markdown module.
export function createMarkdownLoader<M>(
  glob: Record<string, () => Promise<M>>,
  hot: ImportMeta['hot'],
  reference = false,
) {
  const state: { glob: typeof glob; updated: Map<string, M> } = hot?.data.markdownState ?? { glob, updated: new Map() };
  state.glob = glob;
  if (hot) {
    hot.data.markdownState = state;
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; mod: M; reference?: boolean }>).detail;
      if (Boolean(detail.reference) === reference && Object.hasOwn(state.glob, detail.key))
        state.updated.set(detail.key, detail.mod);
    };
    window.addEventListener('studio:markdown', changed);
    hot.dispose(() => window.removeEventListener('studio:markdown', changed));
  }
  return (path: string) =>
    Object.hasOwn(state.glob, path)
      ? state.updated.has(path)
        ? Promise.resolve(state.updated.get(path)!)
        : state.glob[path]()
      : undefined;
}
