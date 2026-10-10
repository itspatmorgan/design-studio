---
title: Marketing library
description: The selected shadcn/Base UI subset and its integration with Studio.
---

Marketing is an independent shadcn/Base UI system for public-facing Design Studio pages. Product remains the default for product prototypes. Product uses square controls, Space Grotesk, and emerald accents; Marketing uses rounded controls, Geist, and warm neutrals.

## Included

- Button: default, outline, ghost, and link styles; small, default, and large sizes.
- Tabs: segmented and underline lists with associated panels.
- Tooltip: supplemental information in a scoped popup.
- Lucide icons, Geist typography, warm brand colors, selected spacing, and four display sizes.
- Light and dark modes, declared in `styles/theme.css`.

The theme file is the inventory. Add omitted tokens and components deliberately. Landing-page sections are local prototype composition.

## Source and adaptations

Components derive from the starter’s vendored [shadcn/ui Base UI components](https://ui.shadcn.com/docs/components). Marketing keeps independent runtime files; it does not import Product. The shadcn MIT notice is retained in `LICENSE`.

Button keeps shadcn’s variant pattern and Base UI behavior with 32px, 40px, and 48px controls. Navigation uses plain anchors styled by `buttonVariants`, preserving link semantics. Icons are ordinary children. Tabs use Base UI values and active states, with Marketing’s rounded geometry. Tooltip uses `usePortalContainer()` and omits animation and arrow embellishments.

All styles and popups stay inside Marketing’s theme boundary. Existing warm neutral color aliases remain for prototype composition, alongside shadcn’s semantic roles. The source brand values remain in [Brand](brand.md); dark mode remains a documented adaptation.

Dependencies are `@base-ui/react`, `class-variance-authority`, `tailwind-merge`, `lucide-react`, and `@fontsource-variable/geist`. No full upstream catalog or global theme is installed.
