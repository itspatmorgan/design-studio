---
title: Support Operations setup
description: Source choices and integration notes for the support-operations demo.
toc: true
---

## Direction and source

A support dashboard with reporting periods, volume and response charts, queue filters, ticket editing, and team workload. Its orange theme distinguishes it from the blue and violet curation demos.

Generated with shadcn CLI **4.21.0**, preset **b3kI3264G**, Base UI Nova, neutral base, orange theme and chart palette, Geist, large corners, and Lucide. Preset resolution reported no fallbacks. This pass uses the preset without DESIGN.md overrides.

[Preset builder](https://ui.shadcn.com/create?preset=b3kI3264G) · [Sidebar](https://ui.shadcn.com/docs/components/base/sidebar) · [Chart](https://ui.shadcn.com/docs/components/base/chart)

## Kit and adaptations

The isolated registry request was `sidebar-07 chart table badge select dialog tabs`. Its dry run produced 24 files, including 18 UI primitives and five sidebar composition files. Existing `cn` satisfied one dependency; charts added **recharts 3.8.0** to this system’s package manifest. Its public Charts library entry exposes additional Recharts APIs to assigned prototypes. The reviewed configuration lives in this system’s `components.json`.

The sidebar block preserves the upstream header, collapsible navigation, footer, rail, and inset layout. Its sample projects, team switcher, and user menu were replaced with functional support navigation. The implementation is `blocks/support-sidebar.tsx`.

Imports point to this system. Select, Sheet, Dialog, Dropdown Menu, and Tooltip portals use the owning theme container. Chart-generated series CSS targets this theme’s local color mode. Sidebar state stays local instead of writing a shared cookie. Spacing formulas use explicit system tokens; initial entry and exit animation utilities were omitted. Component APIs and accessibility behavior remain provided by Base UI. Geist and upstream MIT license information are included.

This kit exposed two compiler issues: redundant upstream semantic color aliases affected other systems, and group/peer markers inherited unrelated utility token requirements. Both have regression coverage in the platform boundary tests.

## Prototype and limits

Prototype ID: `pv859cy7kbjfjqpt`. Artifact ID: `pxe5n3mt8r6xd0ac`.

September activity and six tickets are synthetic. Period changes recompute historical charts and metrics. Ticket edits update current queue and team workload, without rewriting historical activity. Changes reset on reload. No external service, authentication, or persistent storage is connected.

The sidebar and charts were reviewed in light and dark modes. Reporting periods, chart switching, search, queue filtering, ticket reassignment and resolution, and mobile drawer navigation were exercised in the browser. Production and regression checks accompany this demo; final human review remains pending.
