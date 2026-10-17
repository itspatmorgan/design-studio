// #studio/data: the manifest, files and permissions as the app sees them, and what a file type's loader.ts and
// open.tsx implement (src/platform/context/file-types.md). Browser code only.
import { CONFIG as STUDIO_CONFIG } from '../app/data/config.ts';
import type { StudioConfig } from '../core/config.ts';

/** The studio's name, from studio.config.json. */
export { APP_NAME } from '../app/data/config.ts';
/** The studio's tagline from studio.config.json, if it has one. */
export { TAGLINE } from '../app/data/config.ts';

type ReadOnly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: ReadOnly<T[K]> }
    : T;
/** The studio's resolved settings, read-only. */
export const CONFIG: ReadOnly<StudioConfig> = STUDIO_CONFIG;

/** A prototype's summary in the manifest. */
export type { PrototypeInfo } from '../app/data/types.ts';
/** A prototype with its files. */
export type { Prototype } from '../app/data/types.ts';
/** One file of a prototype that a file type opens. */
export type { Artifact } from '../app/data/types.ts';
/** Everything the app knows about the studio's content. */
export type { Manifest } from '../app/data/types.ts';
/** What a file type's open.tsx exports as its default. */
export type { FileTypeModule } from '../app/data/fileTypeModule.ts';
/** The prototype and file an open.tsx loads. */
export type { ArtifactContext } from '../app/data/fileTypeModule.ts';
/** The props of a file type's live Embed. */
export type { EmbedProps } from '../app/data/fileTypeModule.ts';
/** A module-owned file action declared in capabilities.actions and implemented in open.tsx. */
export type { ArtifactAction } from '../app/data/fileTypeModule.ts';
/** A compiled Markdown file. */
export type { MarkdownModule } from '../app/docs/markdownFileModule.tsx';
/** Frontmatter fields a Markdown page may set. */
export type { DocFrontmatter } from '../app/docs/types.ts';
/** The current manifest; it updates as files change in dev. */
export { useManifest } from '../app/data/useManifest.ts';
/** Loads the manifest, for a route loader. */
export { loadManifest } from '../app/data/manifest.ts';
/** A module's build contribution, or undefined when unavailable. The caller supplies its data type. */
export { contribution } from '../app/data/manifest.ts';
/** Every prototype in the manifest, across sections. */
export { allPrototypes } from '../app/data/manifest.ts';
/** A prototype's file by its slug. */
export { findArtifact } from '../app/data/manifest.ts';
/** A file's display label. */
export { artifactLabel } from '../app/data/manifest.ts';
/** Link options for a prototype. */
export { prototypeLink } from '../app/data/manifest.ts';
/** Link options for a prototype's file. */
export { artifactLink } from '../app/data/manifest.ts';
/** The contributor key of the person running the app, or null. */
export { useMe } from '../app/data/files.ts';
/** Whether a person may edit a repository path. */
export { canEditSource } from '../app/data/files.ts';
/** Whether a person may change a prototype's files. */
export { canChangePrototype } from '../app/data/files.ts';
/** Reads a prototype file's text and version from the dev server. */
export { readSource } from '../app/data/files.ts';
/** Saves a prototype file against the version it was read at. */
export { writeSource } from '../app/data/files.ts';
/** Thrown when a file changed on disk since it was read. */
export { SourceChanged } from '../core/source/access.ts';
/** Calls a route of a module's server.ts: POST /__studio/<module>/<route>. */
export { callModule } from '../app/data/files.ts';
/** A client failure with a machine-readable code, optional HTTP status, and display message. */
export { ClientError } from '../core/client-error.ts';
/** Loads a file type's files from its loader.ts glob. */
export { createLoader } from '../app/data/createLoader.ts';
/** Loads Markdown pages from a glob, with frontmatter. */
export { createMarkdownLoader } from '../app/docs/createMarkdownLoader.ts';
/** The open.tsx implementation for a Markdown-based file type. */
export { markdownFileModule } from '../app/docs/markdownFileModule.tsx';
/** Tracks browser compilation and renderer commits; Node-neutral lifecycle primitives remain in #studio/lifecycle. */
export { compiledLifecycle } from '../core/artifact-lifecycle/compiled.ts';
/** Generic source operations; system-specific creation stays with Systems. */
export type { FileOp } from '../app/data/files.ts';
/** A mutation receipt with updated inventory and optional artifact identity/location. */
export type { FileOpResult } from '../app/data/files.ts';
/** A node in the repository file tree. */
export type { FileNode } from '../app/data/files.ts';
/** Applies a generic file operation and synchronizes the application on success. */
export { fileOp } from '../app/data/files.ts';
/** Creates a prototype and returns its permanent identity, location, and updated inventory. */
export { createPrototype } from '../app/data/files.ts';
/** Copies an owned prototype and returns the new identity and location. */
export { duplicatePrototype } from '../app/data/files.ts';
/** Renames a prototype's source location while preserving its permanent identity. */
export { renamePrototype } from '../app/data/files.ts';
/** Trashes an owned prototype and synchronizes the application. */
export { deletePrototype } from '../app/data/files.ts';
/** Reads and refreshes an authored file tree in development. */
export { useFileTree } from '../app/data/files.ts';
/** Opens a prototype file in the configured local editor. */
export { openInEditor } from '../app/data/files.ts';
/** Reveals a prototype file in the local file browser. */
export { revealInFinder } from '../app/data/files.ts';
/** Changes an artifact's fidelity against its current source version. */
export { setArtifactLofi } from '../app/data/files.ts';

/** Calls an owner route whose successful receipt includes its updated manifest. */
export { callModuleMutation } from '../app/data/files.ts';

/** Inspect artifact scope and availability using current metadata, without mounting a renderer. */
export { inspectArtifact } from '../app/artifacts/resolveArtifact.ts';
/** Complete missing artifact inventory, then use the shared inspection policy. */
export { resolveArtifact } from '../app/artifacts/resolveArtifact.ts';
/** A host request with a current artifact origin. */
export type { ArtifactRequest } from '../app/artifacts/resolveArtifact.ts';
/** Shared pending, availability, and presentation metadata. */
export type { ArtifactResolution } from '../app/artifacts/resolveArtifact.ts';
/** Machine-readable artifact availability reasons. */
export type { AvailabilityCode } from '../app/artifacts/resolveArtifact.ts';

/** Loads an enabled module’s named serializable build asset, sharing cached work and surfacing failures. */
export { loadModuleAsset, subscribeModuleAsset } from '../app/data/buildAssets.ts';
