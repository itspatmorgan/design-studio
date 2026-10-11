import { defineFileType, markdownFileType } from '../../core/fileTypes.ts';

// Markdown within a prototype is an optional capability.
export default defineFileType({ ...markdownFileType });
