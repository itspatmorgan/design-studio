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
      "id": "tailwind",
      "label": "Tailwind CSS",
      "description": "Styling utilities and theme integration, supplied by Studio",
      "docs": "https://tailwindcss.com/docs"
    },
    {
      "kind": "source",
      "id": "shadcn",
      "label": "shadcn/ui",
      "description": "Component source and styles",
      "docs": "https://ui.shadcn.com/docs"
    },
    {
      "kind": "package",
      "id": "base-ui",
      "label": "Base UI",
      "package": "@base-ui/react",
      "description": "Accessible component behavior",
      "docs": "https://base-ui.com/react/overview/quick-start"
    },
    {
      "kind": "package",
      "id": "lucide",
      "label": "Lucide",
      "package": "lucide-react",
      "description": "Icon catalog",
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
      "description": "System typeface",
      "docs": "https://fontsource.org/fonts/manrope",
      "assets": [
        "fonts"
      ]
    }
  ],
  origin: 'shadcn',
  studioId: "f8qjkh2qmxpsffqb",
} satisfies SystemSpec;
