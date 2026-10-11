// The glob patterns a file type's loader (src/modules/<type>/loader.ts) lists its files with,
// worked out from the type's extensions and the modules' sections, so a new section needs no change
// to any loader. Vite needs globs written out literally, so scripts/build/vite-globs-plugin.js puts the
// result in place of the ['/__studio_globs__/*'] placeholder when it reads a loader. Patterns are relative to src/.
// Has no imports but types, so Node scripts and tests can load it.
import type { FileTypeSpec } from '../fileTypes.ts';
import { itemFolders, type ModuleSpec } from './index.ts';

const rootOf = (folder: string) => folder.replace(/^src/, ''); // "src/examples" → "/examples"
const extensionGlob = (extensions: readonly string[]) =>
  extensions.length === 1 ? `*${extensions[0]}` : `*.{${extensions.map(e => e.slice(1)).join(',')}}`;

export function globsFor(id: string, types: Record<string, FileTypeSpec>, modules: readonly ModuleSpec[]): string[] {
  const spec = types[id];
  if (!spec) throw new Error(`There is no "${id}" file type, so its loader can't list files.`);
  const systemContent = [
    '/systems/*/context',
    '/systems/*/skills',
    '/platform/context',
    '/platform/skills',
    ...modules.flatMap(m => [`/modules/${m.id}/context`, `/modules/${m.id}/skills`]),
  ];
  const patterns: string[] = [];

  // The fallback type opens whatever no other type claims, in the system content only.
  if (spec.fallback) {
    const claimed = Object.entries(types)
      .filter(([other, s]) => other !== id && s.inSystemContent && s.extensions.length)
      .map(([, s]) => extensionGlob(s.extensions));
    for (const root of systemContent) patterns.push(`${root}/**/*`, ...claimed.map(c => `!${root}/**/${c}`));
    return patterns;
  }
  if (!spec.extensions.length) return patterns;

  // In every section of prototype-shaped folders, helpers (names starting with an underscore) aren't items.
  const extensions = extensionGlob(spec.extensions);
  for (const root of spec.inPrototype !== true ? [] : itemFolders(modules, 'prototypes').map(rootOf)) {
    patterns.push(`${root}/**/${extensions}`, `!${root}/**/_*/**`, `!${root}/**/_*`);
  }
  if (spec.inSystemContent) for (const root of systemContent) patterns.push(`${root}/**/${extensions}`);
  return patterns;
}
