import type { SystemSpec } from '../../modules/systems/spec.ts';

// Support Operations: select source key support-operations in creation controls. Prototype metadata stores this installation’s permanent studioId.
export default {
  status: 'active',
  role: 'prototype',
  label: 'Support Operations',
  themeClass: 'support-operations-theme',
  styling: 'tailwind',
  colorModes: ['light', 'dark'],
  docs: 'warn',
  origin: 'shadcn',
  studioId: "27cef7m64myswpan",
} satisfies SystemSpec;
