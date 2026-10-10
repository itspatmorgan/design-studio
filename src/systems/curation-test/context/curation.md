---
title: Curation Test setup
description: Chosen foundations and the next review for the support dashboard.
---

## Direction

The person chose a small customer-support dashboard and requested visually distinct systems so isolation can be verified. The agent selected a blue theme, Manrope typography, and small corners in the shadcn builder to satisfy that direction. Foundations await human review; no component kit or prototype has been integrated yet. No DESIGN.md was supplied for this run.

## Resolved source

- Builder: https://ui.shadcn.com/create?preset=b1Q4Tg
- Preset code: b1Q4Tg, resolved with shadcn CLI 4.21.0 on 2026-10-10; no inferred fallbacks.
- Base UI; Nova style; neutral base colors; blue theme; neutral chart colors.
- Manrope for body and inherited headings; Lucide icon library; small radius (0.45rem).
- Default menus with subtle accent.
- Font is loaded through the explicit @fontsource-variable/manrope dependency. Lucide is an existing dependency; icon selection is saved but no components use it yet.
- Resolved configuration lives in ../components.json. It describes upstream choices; the scoped stylesheet is the runtime source of truth.

## Adaptation

Generated material was inspected in an isolated temporary Vite workspace. Only scoped theme declarations and reviewed configuration were integrated. Root and dark selectors became .curation-test-theme and its data-color-mode dark override. Global resets and top-level Tailwind configuration were omitted. Color utility mappings, radius formulas, and Manrope font came from the generated preset; a finite type, spacing, weight, and shadow inventory was deliberately added to support the upcoming kit. Other systems and the default were preserved.

The first live run found that passing a full builder link directly to shadcn init fails with an HTML/JSON parse error. Preparation now extracts its preset query parameter while preserving the original source link. Running init with b1Q4Tg succeeded.

## Next review

Review Colors, Typography, and Radius in both light and dark modes. Compare with Product and Marketing to confirm separate fonts and accents. After guidance, add a small kit: Button, Input, Badge, Card, Table, Select, and Dialog. These support ticket search, status labels, filters, and a detail dialog. Then create a representative prototype assigned to this system. Do not mark setup ready until the kit and prototype are reviewed.
