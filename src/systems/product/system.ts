import type { SystemSpec } from '../../modules/systems/spec.ts';

// The placeholder design system the kit ships with. Replace it with your product's, or add yours next to it
// (pnpm studio create-system). A prototype picks one with "system" in its meta.json; without it, the one named by
// the explicitly configured defaultSystem in studio.config.ts.
export default {
  status: 'active',
  role: 'prototype',
  label: 'Product',
  themeClass: 'product-theme',
  styling: 'tailwind',
  colorModes: ['light', 'dark'],
  docs: 'warn',
  libraries: [],
  origin: 'shadcn',
  studioId: "4f3m7z08hk5a0k53",
} satisfies SystemSpec;
