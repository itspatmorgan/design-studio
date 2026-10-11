import type { ModuleSpec } from '#studio/module';

// The text file type: the system content's fallback, any other text file opens read-only (src/platform/context/file-types.md).
export default {
  optional: false,
  settings: { group: 'systems', order: 1 },
  lib: false,
  id: 'text',
  label: 'Text files',
  version: '0.1.0',
  requires: '0.3.0',
  description: 'Any other text file in the SystemContent opens read-only as its text.',
} satisfies ModuleSpec;
