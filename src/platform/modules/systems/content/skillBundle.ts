// Bundle paths are relative to the Skills section. Keep the required entry file first.
export function skillFolder(path: string): string | null {
  const parts = path.split('/');
  return parts.length >= 2 && parts[0] ? parts[0] : null;
}

export function skillBundlePaths(entry: string, paths: string[]): string[] {
  const folder = skillFolder(entry);
  if (!folder) return [];
  const main = folder + '/SKILL.md';
  return [main, ...[...new Set(paths)].filter(path => path.startsWith(folder + '/') && path !== main).sort()];
}
