// #studio/references is Node-only. Source adapters do not import browser readers.
/** Declares source transformations for moves and copied resource links. */
export { defineReferenceAdapter } from '../core/references.ts';
/** The Node-side source adapter a module supplies in references.ts. */
export type { ReferenceAdapter } from '../core/references.ts';
/** Platform-provided resolution for a source move. */
export type { MoveReferenceContext } from '../core/references.ts';
/** Platform-provided resolution for copied permanent links. */
export type { CopyReferenceContext } from '../core/references.ts';
/** Repairs literal code references using supplied resolution callbacks. */
export { moveCode } from '../node/lib/reference-syntax.js';
/** Remaps literal browser references in code, leaving imports untouched. */
export { copyCode } from '../node/lib/reference-syntax.js';
/** Transforms Markdown destinations while preserving prose and fenced examples. */
export { markdownReferences } from '../node/lib/reference-syntax.js';
/** Transforms literal CSS URLs and imports. */
export { cssReferences } from '../node/lib/reference-syntax.js';
