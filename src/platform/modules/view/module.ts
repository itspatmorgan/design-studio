import type { ModuleSpec } from '#studio/module';

// The view file type: a .tsx or .jsx file is a React page in a prototype (src/platform/context/file-types.md).
export default {
  optional: false,
  lib: false,
  id: 'view',
  label: 'Views',
  version: '0.1.0',
  requires: '0.2.0',
  description: 'A .tsx or .jsx file in a prototype opens as a page.',
} satisfies ModuleSpec;
