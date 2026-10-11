// #studio/data: the manifest, files and permissions as the app sees them, and what a file type's loader.ts and
// open.tsx implement (src/platform/context/file-types.md). Browser code only.
import { CONFIG as STUDIO_CONFIG } from '../app/data/config.ts';
import type { StudioConfig } from '../core/config.ts';

/** @stable The studio's name, from studio.config.json. */
export { APP_NAME } from '../app/data/config.ts';
/** @stable The studio's tagline from studio.config.json, if it has one. */
export { TAGLINE } from '../app/data/config.ts';

type ReadOnly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: ReadOnly<T[K]> }
    : T;
/** @stable The studio's resolved settings, read-only. */
export const CONFIG: ReadOnly<StudioConfig> = STUDIO_CONFIG;

/** @experimental A prototype's summary in the manifest. */
export type { PrototypeInfo } from '../app/data/types.ts';
/** @experimental A prototype with its files. */
export type { Prototype } from '../app/data/types.ts';
/** @experimental One file of a prototype that a file type opens. */
export type { Artifact } from '../app/data/types.ts';
/** @experimental Everything the app knows about the studio's content. */
export type { Manifest } from '../app/data/types.ts';
/** @experimental What a file type's open.tsx exports as its default. */
export type { FileTypeModule } from '../app/data/fileTypeModule.ts';
/** @experimental The prototype and file an open.tsx loads. */
export type { ArtifactContext } from '../app/data/fileTypeModule.ts';
/** @experimental The props of a file type's live Embed. */
export type { EmbedProps } from '../app/data/fileTypeModule.ts';
/** @experimental A module-owned file action declared in capabilities.actions and implemented in open.tsx. */
export type { ArtifactAction } from '../app/data/fileTypeModule.ts';
/** @experimental A compiled Markdown file. */
export type { MarkdownModule } from '../app/docs/markdownFileModule.tsx';
/** @experimental Frontmatter fields a Markdown page may set. */
export type { DocFrontmatter } from '../app/docs/types.ts';
/** @experimental The current manifest; it updates as files change in dev. */
export { useManifest } from '../app/data/useManifest.ts';
/** @experimental Loads the manifest, for a route loader. */
export { loadManifest } from '../app/data/manifest.ts';
/** @experimental A module's build contribution, or undefined when unavailable. The caller supplies its data type. */
export { contribution } from '../app/data/manifest.ts';
/** @experimental Every prototype in the manifest, across sections. */
export { allPrototypes } from '../app/data/manifest.ts';
/** @experimental A prototype's file by its slug. */
export { findArtifact } from '../app/data/manifest.ts';
/** @experimental A file's display label. */
export { artifactLabel } from '../app/data/manifest.ts';
/** @experimental Link options for a prototype. */
export { prototypeLink } from '../app/data/manifest.ts';
/** @experimental Link options for a prototype's file. */
export { artifactLink } from '../app/data/manifest.ts';
/** @experimental The contributor key of the person running the app, or null. */
export { useMe } from '../app/data/files.ts';
/** @experimental Whether a person may edit a repository path. */
export { canEditSource } from '../app/data/files.ts';
/** @experimental Whether a person may change a prototype's files. */
export { canChangePrototype } from '../app/data/files.ts';
/** @experimental Reads a prototype file's text and version from the dev server. */
export { readSource } from '../app/data/files.ts';
/** @experimental Saves a prototype file against the version it was read at. */
export { writeSource } from '../app/data/files.ts';
/** @experimental Thrown when a file changed on disk since it was read. */
export { SourceChanged } from '../core/source/access.ts';
/** @experimental Calls a route of a module's server.ts: POST /__studio/<module>/<route>. */
export { callModule } from '../app/data/files.ts';
/** @experimental Loads a file type's files from its loader.ts glob. */
export { createLoader } from '../app/data/createLoader.ts';
/** @experimental Loads Markdown pages from a glob, with frontmatter. */
export { createMarkdownLoader } from '../app/docs/createMarkdownLoader.ts';
/** @experimental The open.tsx implementation for a Markdown-based file type. */
export { markdownFileModule } from '../app/docs/markdownFileModule.tsx';
