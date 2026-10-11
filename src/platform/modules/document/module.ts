import type { ModuleSpec } from '#studio/module';

// The document file type: a .md file is a written page in a prototype (src/platform/context/file-types.md).
export default {
  lib: false,
  id: 'document',
  label: 'Documents',
  version: '0.1.0',
  requires: '0.2.0',
  description: 'A .md file in a prototype opens as a written page.',
  optional: true,
  instructions: [{ path: 'skills/write-document/', when: 'asks for a document inside a prototype' }],
} satisfies ModuleSpec;
