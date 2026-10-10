---
title: Curation Test setup
description: Chosen foundations and the next review for the support dashboard.
---

## Direction

The person chose a small customer-support dashboard and requested visually distinct systems so isolation can be verified. The agent selected a blue theme, Manrope typography, and small corners in the shadcn builder to satisfy that direction. The person reviewed and accepted the foundations on 2026-10-10. The seven-component kit and representative prototype are now implemented and await their review. No DESIGN.md was supplied for this run.

## Resolved source

- Builder: https://ui.shadcn.com/create?preset=b1Q4Tg
- Preset code: b1Q4Tg, resolved with shadcn CLI 4.21.0 on 2026-10-10; no inferred fallbacks.
- Base UI; Nova style; neutral base colors; blue theme; neutral chart colors.
- Manrope for body and inherited headings; Lucide icon library; small radius (0.45rem).
- Default menus with subtle accent.
- Font is loaded through the explicit @fontsource-variable/manrope dependency. Lucide is an existing dependency used by buttons, the status filter, dialog, and dashboard.
- Resolved configuration lives in ../components.json. It describes upstream choices; the scoped stylesheet is the runtime source of truth.

## Adaptation

Generated material was inspected in an isolated temporary Vite workspace. Scoped theme declarations, reviewed configuration, and seven selected components were integrated. Root and dark selectors became .curation-test-theme and its data-color-mode dark override. Global resets and top-level Tailwind configuration were omitted. Color utility mappings, radius formulas, and Manrope font came from the generated preset; a finite type, spacing, weight, and shadow inventory was deliberately added to support the upcoming kit. Other systems and the default were preserved.

The first live run found that passing a full builder link directly to shadcn init fails with an HTML/JSON parse error. Preparation now extracts its preset query parameter while preserving the original source link. Running init with b1Q4Tg succeeded.

## Kit and prototype

Button, Input, Badge, Card, Table, Select, and Dialog were generated from the Base UI Nova registry using CLI 4.21.0. Each has a documentation page and working examples. Base UI 1.8.0, cn, class-variance-authority, and Lucide were already installed; no component runtime dependencies were added. The upstream MIT notice is preserved in ../LICENSE.

Select and Dialog portals use the shared usePortalContainer helper. Card spacing formulas reference explicit spacing tokens. Initial popup entry/exit animation utilities were removed; regular transitions and Base UI focus/state behavior remain. Required component and prototype tokens were added deliberately, including container sizes, breakpoints, blur, and shadow.

Representative prototype: Curation Support Dashboard, permanent ID d4dh23dxhd1pmsjd, assigned to this system. Artifact ID c9tgy7px512tc8h2. Its six sample tickets support text search, status filtering, empty results, ticket details, and marking a ticket resolved. State is local to the preview and resets on reload; it is not connected to a support service.

## Verification

- Production build passed, including type, theme-inventory, and dependency-boundary validation. Existing chunk-size warning remains. Log: /tmp/curation-dashboard-build.log.
- All seven documentation pages and examples loaded in both color modes.
- Search reduced six tickets to the invoice match; a missing term showed the empty state. Pending filter showed two tickets. Resolving one reduced pending to one and increased resolved to two.
- Popup DOM and computed styles confirmed the Curation Test scope, Manrope font, and mode-appropriate dialog surface.
- Product retained Space Grotesk and emerald; Marketing retained Geist and neutral styling during the foundations review. Default assignment was preserved.

## Next review

Try the dashboard and component examples in Studio. Review the kit and prototype with the person before marking the system ready. Keep the saved curation stage at prototype until that review is complete.
