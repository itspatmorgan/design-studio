import type { ModuleSpec } from '../../core/api.ts';

export default {
  lib: false,
  id: 'diagrams',
  label: 'Diagrams',
  version: '0.1.0',
  description: 'Mermaid source files open as diagrams alongside prototype views and documents.',
  optional: true,
  instructions: [{ path: 'skills/create-diagram/', when: 'asks for a standalone diagram inside a prototype' }],
} satisfies ModuleSpec;
