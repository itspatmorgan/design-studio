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
      "label": "Space Grotesk",
      "package": "@fontsource-variable/space-grotesk",
      "description": "The typeface used by this system.",
      "docs": "https://fontsource.org/fonts/space-grotesk",
      "assets": [
        "fonts"
      ]
    }
  ],
  origin: 'shadcn',
  studioId: "4f3m7z08hk5a0k53",
} satisfies SystemSpec;
