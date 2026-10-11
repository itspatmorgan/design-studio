import type { SystemSpec } from '../../modules/systems/spec.ts';

// Curation Demo: select source key curation-demo in creation controls. Prototype metadata stores this installation’s permanent studioId.
export default {
  status: 'active',
  role: 'prototype',
  label: 'Curation Demo',
  themeClass: 'curation-demo-theme',
  styling: 'tailwind',
  colorModes: ['light', 'dark'],
  docs: 'warn',
  libraries: [],
  origin: 'shadcn',
  studioId: "3afj4vmr5mvherhv",
} satisfies SystemSpec;
