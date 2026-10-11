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
      "label": "Geist",
      "package": "@fontsource-variable/geist",
      "description": "The typeface used by this system.",
      "docs": "https://fontsource.org/fonts/geist",
      "assets": [
        "fonts"
      ]
    }
  ],
  origin: 'shadcn',
  studioId: "v4576ka1mbpbqdp1",
} satisfies SystemSpec;
