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
  libraries: [{
    id: 'charts',
    label: 'Recharts',
    package: 'recharts',
    description: 'Charts and data visualization. Use the Chart component for this system’s theme, or compose additional chart types.',
    entry: 'libraries/charts.ts',
    docs: 'https://recharts.github.io/en-US/',
    components: ['chart'],
  }],
  origin: 'shadcn',
  studioId: "27cef7m64myswpan",
} satisfies SystemSpec;
