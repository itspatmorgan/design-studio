import type { SystemSpec } from '#studio/system';

// The placeholder design system the kit ships with. Replace it with your product's, or add yours next to it
// (pnpm studio create-system). A prototype picks one with "system" in its meta.json; without it, the one named by
// the explicitly configured defaultSystem in studio.config.json.
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
      "id": "tailwind",
      "label": "Tailwind CSS",
      "description": "Styling utilities and theme integration, supplied by Studio",
      "docs": "https://tailwindcss.com/docs"
    },
    {
      "kind": "source",
      "id": "tw-animate-css",
      "label": "tw-animate-css",
      "description": "Component entry and exit animations, supplied by Studio",
      "docs": "https://github.com/Wombosvideo/tw-animate-css",
      "components": [
        "dialog",
        "dropdown-menu",
        "select",
        "tooltip"
      ]
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
      "label": "Space Grotesk",
      "package": "@fontsource-variable/space-grotesk",
      "description": "System typeface",
      "docs": "https://fontsource.org/fonts/space-grotesk",
      "assets": [
        "fonts"
      ]
    }
  ],
  origin: 'shadcn',
  studioId: "4f3m7z08hk5a0k53",
} satisfies SystemSpec;
