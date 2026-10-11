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
  libraries: [
    {
      "kind": "source",
      "id": "shadcn",
      "label": "shadcn/ui",
      "description": "The source for this system’s curated components and styles.",
      "docs": "https://ui.shadcn.com/docs"
    },
    {
      "kind": "package",
      "id": "base-ui",
      "label": "Base UI",
      "package": "@base-ui/react",
      "description": "Accessible behavior for this system’s interactive components.",
      "docs": "https://base-ui.com/react/overview/quick-start"
    },
    {
      "kind": "package",
      "id": "lucide",
      "label": "Lucide",
      "package": "lucide-react",
      "description": "A full catalog of interface icons.",
      "docs": "https://lucide.dev/icons/",
      "assets": [
        "icons"
      ]
    },
    {
      "kind": "package",
      "id": "font",
      "label": "Manrope",
      "package": "@fontsource-variable/manrope",
      "description": "The typeface used by this system.",
      "docs": "https://fontsource.org/fonts/manrope",
      "assets": [
        "fonts"
      ]
    }
  ],
  origin: 'shadcn',
  studioId: "f8qjkh2qmxpsffqb",
} satisfies SystemSpec;
