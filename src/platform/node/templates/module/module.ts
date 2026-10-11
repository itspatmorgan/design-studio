import type { ModuleSpec } from '../../platform/core/api.ts';

// __LABEL__. This file says what the module is, and what it adds. See src/platform/context/modules.md for everything
// it can say: a section (an address and a folder), a lib prototypes can import, module context and skills, npm dependencies.
export default {
  lib: false,
  id: '__ID__',
  label: '__LABEL__',
  version: '0.1.0',
  description: 'Say what __LABEL__ adds, in one sentence.',
  optional: true,
  section: { key: '__ID__' },
  instructions: [{ path: 'skills/use-__ID__/', when: 'asks about __LABEL__' }],
} satisfies ModuleSpec;
