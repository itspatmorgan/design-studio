// Arranges a menu's items into groups, for a divider between them. Items that are false, null, or
// undefined (an action that doesn't apply) are dropped, then groups with nothing left. Groups are
// never merged: every menu lists the same kinds of group in the same order (see the callers), so a
// group is always where you expect it.
//   menuGroups([[create], [view], [open, reveal, copy], [rename], [delete]])
// Has no imports, so it can be tested on its own.
export function menuGroups<T>(groups: (T | false | null | undefined)[][]): T[][] {
  return groups.map(group => group.filter((item): item is T => Boolean(item))).filter(group => group.length > 0);
}
