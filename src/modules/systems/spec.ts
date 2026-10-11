// A design system prototypes build with is a folder in src/systems/<id>/ with a system.ts that says what it is,
// next to its components/ and styles/theme.css. The build, the dev server and the app all find the systems by
// their folders; studio.config.ts explicitly registers each installed system.
// The Studio system lives in src/systems/studio/ and declares role: 'platform'; prototypes
// never use it (src/modules/systems/sources.ts). Node scripts and the app share this contract.
import { resourceId } from '../../platform/core/fileTypes.ts';

export type ColorMode = 'light' | 'dark';

// Resolve global mode against the system's explicitly declared supported modes.
export function systemColorMode(supported: readonly ColorMode[], global: ColorMode): ColorMode {
  const modes = supported;
  if (!modes.length) throw new Error('A system must declare at least one color mode.');
  return modes.includes(global) ? global : modes[0];
}

// How the build treats a component without examples or a description (systemDocs.ts): 'warn' says
// so, 'strict' fails the build, and 'off' says nothing.
export type DocsMode = 'warn' | 'strict' | 'off';

export type SystemLibrary = {
  kind: 'package' | 'source';
  id: string;
  label: string;
  package?: string; // installed dependency for kind: package
  version?: string; // authored provenance for kind: source
  description: string;
  entry?: string; // optional public runtime entry, e.g. libraries/charts.ts
  docs: string;
  assets?: readonly ('fonts' | 'icons' | 'images')[];
  components?: readonly string[];
};

export type SystemSpec = {
  studioId?: string;           // permanent installed identity; optional until explicit migration
  role: 'platform' | 'prototype';
  status: 'active' | 'archived';
  renameReview?: readonly string[]; // references that require an agent review after renaming
  label: string;               // "Product"
  // The class its theme is set under, like "product-theme". Its styles/theme.css may set values only under
  // this class, so it can't leak into the app UI or another system.
  themeClass: string;
  // Select the declared utility contract, or own scoped CSS without Tailwind token requirements.
  styling: 'tailwind' | 'custom';
  colorModes: readonly ColorMode[];
  docs: DocsMode;
  // Where its components come from. 'shadcn' gives each component page a link to that component's
  // shadcn/ui docs; a page can set its own link with `docs:` in its frontmatter. Use null for a
  // system that isn't shadcn/ui; declare null instead.
  origin: 'shadcn' | null;
  libraries: readonly SystemLibrary[];
};

const ID = /^[a-z][a-z0-9-]*$/;
const CLASS = /^[a-z][a-z0-9-]*$/;

// What is wrong with a system's system.ts, each as a sentence that says what to fix. `folder` is the folder it
// was found in, which is also its id.
export function systemProblems(spec: unknown, folder: string): string[] {
  const where = `src/systems/${folder}/system.ts`;
  if (!ID.test(folder)) return [`src/systems/${folder}/: a system's folder should be lowercase letters, numbers, and dashes, starting with a letter.`];
  if (!spec || typeof spec !== 'object') return [`${where} must export a system as its default.`];
  const s = spec as Partial<SystemSpec>;
  const problems: string[] = [];
  if (s.studioId !== undefined) {
    try { resourceId(s.studioId); } catch (error) { problems.push(`${where}: ${(error as Error).message}`); }
  }
  if (!['active', 'archived'].includes(s.status ?? '')) problems.push(`${where}: status must explicitly be active or archived.`);
  if (s.role === 'platform' && s.status !== 'active') problems.push(`${where}: the platform system must stay active.`);
  if (!s.role || !['platform', 'prototype'].includes(s.role)) problems.push(where + ": role must be 'platform' or 'prototype'.");
  if (typeof s.label !== 'string' || !s.label.trim()) problems.push(`${where}: add a label, the name people see.`);
  if (typeof s.themeClass !== 'string' || !CLASS.test(s.themeClass)) problems.push(`${where}: themeClass should be a CSS class name like "${folder}-theme".`);
  if (!Array.isArray(s.colorModes) || !s.colorModes.length || s.colorModes.some((mode) => !['light', 'dark'].includes(mode)) || new Set(s.colorModes).size !== s.colorModes.length) problems.push(`${where}: colorModes must be a nonempty list of unique 'light' or 'dark' modes.`);
  if (!['tailwind', 'custom'].includes(s.styling ?? '')) problems.push(`${where}: styling must be 'tailwind' or 'custom'.`);
  if (!s.docs || !['warn', 'strict', 'off'].includes(s.docs)) problems.push(`${where}: docs should be 'warn', 'strict', or 'off'.`);
  if (s.origin !== null && s.origin !== 'shadcn') problems.push(`${where}: origin should be 'shadcn', or explicitly null.`);
  if (!Array.isArray(s.libraries)) problems.push(`${where}: libraries must be an explicit list (use [] when empty).`);
  else {
    const ids = new Set<string>();
    for (const library of s.libraries) {
      if (!library || typeof library !== 'object') { problems.push(`${where}: each library must be an object.`); continue; }
      if (typeof library.id !== 'string' || !ID.test(library.id) || ids.has(library.id)) problems.push(`${where}: library IDs must be unique lowercase names.`);
      ids.add(library.id);
      if (![library.label, library.description].every(value => typeof value === 'string' && value.trim())) problems.push(`${where}: libraries need a label and description.`);
      if (!['package', 'source'].includes(library.kind)) problems.push(`${where}: library kind must be package or source.`);
      if (library.kind === 'package' && (typeof library.package !== 'string' || !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(library.package))) problems.push(`${where}: package libraries must name an npm package, without a subpath.`);
      if (library.kind === 'source' && (library.package !== undefined || library.entry !== undefined)) problems.push(`${where}: source libraries do not declare a package or runtime entry.`);
      if (library.kind === 'package' && library.version !== undefined) problems.push(`${where}: installed library versions come from package resolution.`);
      if (library.version !== undefined && (typeof library.version !== 'string' || !library.version.trim())) problems.push(`${where}: source version must be nonempty when provided.`);
      if (library.entry !== undefined && (typeof library.entry !== 'string' || !/^libraries\/[a-z0-9/-]+\.(?:ts|tsx|js|jsx)$/.test(library.entry) || library.entry.split('/').includes('..'))) problems.push(`${where}: library entry must be a runtime file under libraries/.`);
      if (library.assets !== undefined && (!Array.isArray(library.assets) || library.assets.some((asset: unknown) => typeof asset !== 'string' || !['fonts', 'icons', 'images'].includes(asset)))) problems.push(`${where}: library assets must be fonts, icons, or images.`);
      if (typeof library.docs !== 'string' || !/^https:\/\/\S+$/.test(library.docs)) problems.push(`${where}: libraries need an HTTPS documentation link.`);
      if (library.components !== undefined && (!Array.isArray(library.components) || library.components.some((slug: unknown) => typeof slug !== 'string' || !ID.test(slug)))) problems.push(`${where}: library components must be component slugs.`);
    }
  }
  return problems;
}

// A theme scope is shared by every mounted instance of one system, never by different systems.
export function themeClassProblems(systems: Record<string, Partial<SystemSpec>>): string[] {
  const seen = new Map<string, string>();
  const problems: string[] = [];
  for (const [id, spec] of Object.entries(systems)) {
    if (!spec.themeClass) continue;
    if (['dark', 'light'].includes(spec.themeClass) || spec.themeClass === 'studio-theme' && spec.role !== 'platform') problems.push(`${id}: themeClass ${spec.themeClass} is reserved by the platform.`);
    if (seen.has(spec.themeClass)) problems.push(`${id} and ${seen.get(spec.themeClass)} use the same themeClass ${spec.themeClass}. Give each system its own scope.`);
    seen.set(spec.themeClass, id);
  }
  return problems;
}

// The application system is identified by role, independently of its folder name.
export function platformSystemId(systems: Record<string, Partial<SystemSpec>>): string {
  const ids = Object.keys(systems).filter(id => systems[id].role === 'platform');
  if (ids.length !== 1) throw new Error(`Exactly one system must declare role: 'platform'; found ${ids.length}.`);
  return ids[0];
}
