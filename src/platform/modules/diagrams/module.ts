import type { ModuleSpec } from '#studio/module';

export default {
  lib: false,
  id: 'diagrams',
  label: 'Diagrams',
  version: '0.1.0',
  requires: '0.3.0',
  description: 'Mermaid source files open as diagrams alongside prototype views and documents.',
  optional: true,
  settings: { group: 'prototyping', order: 3 },
  instructions: [{ path: 'skills/create-diagram/', when: 'asks for a standalone diagram inside a prototype' }],
} satisfies ModuleSpec;
