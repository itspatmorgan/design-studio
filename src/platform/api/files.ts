// #studio/files: how a module declares a file type in its type.ts (src/platform/context/file-types.md).
// Node loads type.ts directly, so this entry stays free of browser and React code. Reading files and the
// manifest in the app is #studio/data.
/** The declaration a type.ts passes to defineFileType. */
export type { FileTypeSpec } from '../core/fileTypes.ts';
/** What a file type supports: FileTypeSpec.capabilities. */
export type { ArtifactCapabilities } from '../core/fileTypes.ts';
/** A surface that can show a live preview of another file: 'document' or 'canvas'. */
export type { EmbedSurface } from '../core/fileTypes.ts';
/** Reads and writes a file's permanent identity: FileTypeSpec.identity. */
export type { IdentityMetadata } from '../core/fileTypes.ts';
/** A permanent resource identity. */
export type { ResourceId } from '../core/fileTypes.ts';
/** Validates a file type declaration and returns it; a type.ts exports its result as default. */
export { defineFileType } from '../core/fileTypes.ts';
/** The Markdown document declaration, to extend for a Markdown-based type. */
export { markdownFileType } from '../core/fileTypes.ts';
/** Identity in Markdown frontmatter, for a Markdown-based type. */
export { markdownIdentity } from '../core/fileTypes.ts';
/** A file's path without its extension: the slug in its address. */
export { artifactSlug } from '../core/fileTypes.ts';
/** Whether the format can render with this prototype's system dependency. */
export { artifactSystemAvailability } from '../core/fileTypes.ts';
/** Validates a permanent resource ID, without resolving it to a source path. */
export { resourceId } from '../core/resourceIdentity.ts';
/** A prototype's permanent public address. */
export { prototypeAddress } from '../core/resourceIdentity.ts';
/** A parent-scoped artifact's permanent public address. */
export { artifactAddress } from '../core/resourceIdentity.ts';
/** A system's permanent public address. */
export { systemAddress } from '../core/resourceIdentity.ts';
/** Parses permanent prototype/artifact addresses; mutable content paths are not accepted. */
export { parsePrototypeAddress } from '../core/resourceIdentity.ts';
/** Reads a single unambiguous JSON metadata identity. */
export { jsonIdentity } from '../core/resourceIdentity.ts';
/** Generic JSON metadata identity adapter; format ownership remains in each module. */
export { jsonIdentityMetadata } from '../core/resourceIdentity.ts';
/** Validates zero or one identity declarations, rejecting duplicates. */
export { identityFromDeclarations } from '../core/resourceIdentity.ts';

/** An owner-declared artifact host policy. */
export type { HostSurfaceSpec } from '../core/fileTypes.ts';
