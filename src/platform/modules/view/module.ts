import type { ModuleSpec } from '../../core/api.ts';

// The view file type: a .tsx or .jsx file is a React page in a prototype (src/platform/context/file-types.md).
export default {
  optional: false,
  lib: false,
  id: 'view',
  label: 'Views',
  version: '0.1.0',
  description: 'A .tsx or .jsx file in a prototype opens as a page.',
} satisfies ModuleSpec;
