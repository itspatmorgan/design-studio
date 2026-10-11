// Supported framework entrypoints for module implementations. Keep this inventory
// explicit: importing another platform implementation file is a boundary violation.
// These source APIs are 0.x; changes require release guidance and module verification.
export const MODULE_PLATFORM_ENTRIES: readonly string[] = [
  'src/platform/app/artifacts/ArtifactCard',
  'src/platform/app/artifacts/EmbedFrame',
  'src/platform/app/artifacts/artifactLinks',
  'src/platform/app/data/config',
  'src/platform/app/data/createLoader',
  'src/platform/app/data/fileTypeModule',
  'src/platform/app/data/fileTypes',
  'src/platform/app/data/files',
  'src/platform/app/data/manifest',
  'src/platform/app/data/modules',
  'src/platform/app/data/types',
  'src/platform/app/data/useManifest',
  'src/platform/app/diagrams/MermaidDiagram',
  'src/platform/app/docs/DocBase',
  'src/platform/app/docs/DocLayout',
  'src/platform/app/docs/DocumentationEditor',
  'src/platform/app/docs/DocumentationHeader',
  'src/platform/app/docs/DocumentationNavItem',
  'src/platform/app/docs/Prose',
  'src/platform/app/docs/markdownFileModule',
  'src/platform/app/docs/createMarkdownLoader',
  'src/platform/app/docs/types',
  'src/platform/app/items/Collection',
  'src/platform/app/items/CollectionCard',
  'src/platform/app/items/HomeSection',
  'src/platform/app/items/ItemRow',
  'src/platform/app/modules',
  'src/platform/app/settings/useStudioSettings',
  'src/platform/app/shell/App',
  'src/platform/app/shell/ContributorAvatar',
  'src/platform/app/shell/FileActionItems',
  'src/platform/app/shell/FileNavItem',
  'src/platform/app/shell/appPrefs',
  'src/platform/app/shell/artifactShortcuts',
  'src/platform/app/shell/menuGroups',
  'src/platform/app/shell/nav/index',
  'src/platform/app/source/ArtifactSource',
  'src/platform/core/api',
  'src/platform/core/artifact-lifecycle/index',
  'src/platform/core/declarations',
  'src/platform/core/fileTypes',
  'src/platform/core/modules/index',
  'src/platform/core/order',
  'src/platform/core/permissions',
  'src/platform/core/roots',
  'src/platform/core/source/SourceEditor',
  'src/platform/core/source/access',
  'src/platform/core/source/useSourceView',
];

export function modulePlatformProblem(importer: string, target: string, raw = false): string | null {
  if (!/^src\/modules\/[^/]+\//.test(importer) || !target.startsWith('src/platform/')) return null;
  // Node tooling is not part of the module API surface; a module's Node-side files import it directly.
  if (target.startsWith('src/platform/node/')) return null;
  // The shared knowledge readers may render Markdown or inspect support files as raw text.
  // This does not permit executing platform skill scripts or importing runtime implementation.
  const knowledge = /^src\/platform\/(?:context|skills)\//.test(target);
  if (
    knowledge &&
    ((importer === 'src/modules/systems/loader.ts' && target.endsWith('.md')) ||
      (importer === 'src/modules/text/loader.ts' && raw))
  )
    return null;
  const entry = target.replace(/\.[cm]?[jt]sx?$/, '');
  return MODULE_PLATFORM_ENTRIES.includes(entry)
    ? null
    : `${importer} imports private platform code (${target}). Use the public module API or a supported framework entrypoint.`;
}
