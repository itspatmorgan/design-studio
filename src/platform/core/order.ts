// Order: how a prototype's files are arranged in its navigation. By default, at each level, files
// come first, then folders, each alphabetical. A prototype can set its own order with meta.json
// "order": a list of paths (files and folders, relative to the prototype). Listed paths come first, in
// the listed sequence, among the others in their folder; anything not listed follows in the default
// order, so a new file lands after the ones you arranged. Order never changes a file's name or
// location. Has no imports, so Node scripts and the app can both load it.
export type Entry = { path: string; name: string; dir: boolean };

export const parentOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');

// meta.json "order" if it's a list of paths, else null.
export const parseOrder = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every(p => typeof p === 'string' && p.length > 0) ? (value as string[]) : null;

// Entries of one folder in display order.
export function byOrder<T extends Entry>(entries: T[], order: readonly string[] = []): T[] {
  const rank = new Map(order.map((p, i) => [p, i]));
  const byName = (a: T, b: T) => Number(a.dir) - Number(b.dir) || a.name.localeCompare(b.name);
  return [...entries].sort((a, b) => {
    const ra = rank.get(a.path);
    const rb = rank.get(b.path);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return byName(a, b);
  });
}

// The list after one folder's children are set to `paths`, in that sequence. Other folders' entries stay.
export const withFolderOrder = (order: readonly string[], folder: string, paths: readonly string[]): string[] => [
  ...order.filter(p => parentOf(p) !== folder),
  ...paths,
];

// `siblings` (a folder's children in display order) with `moving` put before `before`, or last when
// `before` is empty. Returns the new sequence.
export function place(siblings: readonly string[], moving: string, before: string): string[] {
  const rest = siblings.filter(p => p !== moving);
  const at = before ? rest.indexOf(before) : -1;
  if (at < 0) return [...rest, moving];
  return [...rest.slice(0, at), moving, ...rest.slice(at)];
}

// The list after `from` is renamed to `to` (a folder takes the paths inside it along), or dropped
// from the list when `to` is null (it was deleted).
export function afterChange(order: readonly string[], from: string, to: string | null): string[] {
  return order.flatMap(p => {
    if (p === from) return to ? [to] : [];
    if (p.startsWith(`${from}/`)) return to ? [`${to}${p.slice(from.length)}`] : [];
    return [p];
  });
}
