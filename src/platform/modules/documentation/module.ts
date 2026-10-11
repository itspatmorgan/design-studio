import type { ModuleSpec } from '#studio/module';

// Documentation: Manual chapters about Design Studio (/documentation/manual), pages in src/platform/modules/documentation/pages/.
export default {
  lib: false,
  id: 'documentation',
  label: 'Documentation',
  version: '0.1.0',
  requires: '0.2.0',
  description: 'Documentation: a human Manual alongside the shared Context and Skills browser.',
  optional: true,
  instructions: [{ path: 'skills/write-manual/', when: 'asks to add or change the human Manual' }],
  section: { key: 'documentation', folder: 'src/platform/modules/documentation/pages' },
} satisfies ModuleSpec;
