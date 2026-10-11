// #studio/files: how a module declares a file type in its type.ts (src/platform/context/file-types.md).
// Node loads type.ts directly, so this entry stays free of browser and React code. Reading files and the
// manifest in the app is #studio/data.
/** @stable The declaration a type.ts passes to defineFileType. */
export type { FileTypeSpec } from '../core/fileTypes.ts';
/** @stable What a file type supports: FileTypeSpec.capabilities. */
export type { ArtifactCapabilities } from '../core/fileTypes.ts';
/** @stable A surface that can show a live preview of another file: 'document' or 'canvas'. */
export type { EmbedSurface } from '../core/fileTypes.ts';
/** @stable Reads and writes a file's permanent identity: FileTypeSpec.identity. */
export type { IdentityMetadata } from '../core/fileTypes.ts';
/** @stable A permanent resource identity. */
export type { ResourceId } from '../core/fileTypes.ts';
/** @experimental Validates a file type declaration and returns it; a type.ts exports its result as default. */
export { defineFileType } from '../core/fileTypes.ts';
/** @experimental The Markdown document declaration, to extend for a Markdown-based type. */
export { markdownFileType } from '../core/fileTypes.ts';
/** @experimental Identity in Markdown frontmatter, for a Markdown-based type. */
export { markdownIdentity } from '../core/fileTypes.ts';
/** @experimental A file's path without its extension: the slug in its address. */
export { artifactSlug } from '../core/fileTypes.ts';
