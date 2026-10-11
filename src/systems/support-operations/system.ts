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
      "label": "Geist",
      "package": "@fontsource-variable/geist",
      "description": "System typeface",
      "docs": "https://fontsource.org/fonts/geist",
      "assets": [
        "fonts"
      ]
    },
    {
      "kind": "package",
      "id": "charts",
      "label": "Recharts",
      "package": "recharts",
      "description": "Charts and data visualization",
      "entry": "libraries/charts.ts",
      "docs": "https://recharts.github.io/en-US/",
      "components": [
        "chart"
      ]
    }
  ],
  origin: 'shadcn',
  studioId: "27cef7m64myswpan",
} satisfies SystemSpec;
