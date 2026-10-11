import type { SystemSpec } from '../../modules/systems/spec.ts';

// Curation Test: select source key curation-test in creation controls. Prototype metadata stores this installation’s permanent studioId.
export default {
  status: 'active',
  role: 'prototype',
  label: 'Curation Test',
  themeClass: 'curation-test-theme',
  styling: 'tailwind',
  colorModes: ['light', 'dark'],
  docs: 'warn',
  libraries: [],
  origin: 'shadcn',
  studioId: "f8qjkh2qmxpsffqb",
} satisfies SystemSpec;
