import type { SystemSpec } from '../../modules/systems/spec.ts';

// Marketing: a design system prototypes can build with. A prototype picks it with "system": "marketing" in its meta.json.
export default {
  status: "active",
  role: 'prototype',
  label: 'Marketing',
  themeClass: 'marketing-theme',
  styling: 'tailwind',
  colorModes: ['light', 'dark'],
  docs: 'warn',
  origin: 'shadcn',
  studioId: "v4576ka1mbpbqdp1",
} satisfies SystemSpec;
