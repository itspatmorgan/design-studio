---
title: Curation Demo setup
description: Sources, decisions, and verification for the second end-to-end curation pass.
---

## Direction

The person requested a fresh end-to-end demo run. The agent selected a violet Base UI Nova configuration with Geist and large corners for comparison with Curation Test. The agent-authored demo DESIGN.md adds 28px page titles, 14px body text, 36px default buttons and inputs, and 16px card gaps. This is synthetic test guidance, not supplied company branding. Preserved input: [design direction](design.md).

## Sources and integration

- Builder: https://ui.shadcn.com/create?preset=b5OQCW
- shadcn CLI 4.21.0; resolved preset b5OQCW with no fallbacks. Base UI Nova, neutral base/chart colors, violet accents, Geist, large radius 0.875rem, Lucide, default menu/subtle accent.
- Generated independently in an isolated Vite workspace through prepare-shadcn; configuration saved to this system's components.json.
- Button, Input, Badge, Card, Table, Select, Dialog came from the upstream Base UI Nova registry. Existing installed Base UI, cn, CVA, Geist, and Lucide dependencies suffice. MIT notice preserved in LICENSE.
- Adapted root/dark CSS into this system's theme boundary. Finite inventory for the selected kit, matching the established integration pattern; no globals or shared theme replacement.
- Select/Dialog portals use usePortalContainer. Entry/exit animation utilities omitted; Base UI interaction behavior retained. Card spacing formulas refer to explicit tokens.
- DESIGN.md changes default Button/Input/Select heights to 36px and the page-title token to 28px. Preset semantic colors and radius remain intact.
- Reused the existing seven-component documentation/example pattern. Runtime component source was freshly generated.

## Prototype

Curation Triage Demo: ma5st80bk1dfr43v, artifact nmp2gq70vg2mn1tm. Synthetic local state only. No external services.

## Verification

- New-system creation, builder preset, DESIGN.md input, component choices, and copied prompt worked end to end. The preset resolved without fallbacks.
- All seven component pages loaded in both modes. Context, theme, asset, Overview, and prototype links loaded without missing pages.
- Search, empty results, status filtering, and resolving a ticket worked. The counters updated after resolution. Enter opened details; Escape closed them and restored focus.
- Dialogs retained this system's Geist font and mode-appropriate surface. Computed control height was 36px and page-title size was 28px.
- Curation Test retained blue/Manrope, Product retained emerald/Space Grotesk, and Marketing retained neutral/Geist. Product remains the default system.
- Production build passed. Full branch regressions passed: 409 tests. A contributor-scope test fixture was corrected to commit every registered system declaration rather than only the starter declarations.
- Browser viewport override did not apply; narrow-screen behavior remains unverified. Final human review remains pending.
