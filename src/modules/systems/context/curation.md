---
title: System curation
description: Overview as the starting point for system setup.
---

## Overview summary

Local active prototype systems offer setup from Overview. Once setup begins and an authored curation record is present, Overview shows the regular Instructions, Toolkit, and usage blocks without setup controls or a progress tracker. Setup details remain in system context, navigation, and the agent chat. Empty systems show the starting choices directly. Populated systems without a saved curation summary offer **Curate or bring in a system**. Example systems instead show a prominent banner with **Customize this system** and **Start with a new system**. Customization reveals a copyable prompt to adapt the existing foundation while preserving prototypes. The new-system link opens the Systems collection; deletion stays in the system menu. After the requested customization is complete, the agent sets `overview.starter: false` and updates the system summary in `intro.tsx`. This persistently clears the example banner for everyone. Opening or copying a prompt does not clear it. Studio and archived systems have no setup controls. Published sites omit the curation panel.

Setup uses three stacked Overview blocks on one page: **Choose your system foundation**, **Add your setup details**, and **Copy and send your prompt**. All remain visible, with the selected tab controlling the choices and generated prompt. Each uses the Overview muted surface, subtle border, padding, and heading style. The handoff is: choose a starting point with Studio Tabs, describe inputs, then copy and send the visible prompt in the agent chat. The curated paths ask what the person wants to build and any components they already want, so the agent can select the first useful kit. The existing React path asks for a repository URL or full local project folder path. These inputs are kept separately for each starting point while the page is open. The agent requests files in chat only as needed for the next step. These draft inputs are not persisted. The shadcn starting path links to its upstream builder. An optional preset code or builder link and a DESIGN.md link or file path are included in copied instructions. DESIGN.md can establish the design direction without a preset. This field does not save or install anything. Overview offers **Curate from shadcn** and **Bring your own**. Bring your own starts an assessment of existing React code, not an import.

The component request uses a textarea. The primary copy action sits below the always-visible prompt. Preset help beside the label shows a cropped screenshot of the builder’s lower sidebar (`assets/shadcn-preset-help.png`, captured from https://ui.shadcn.com/create on 2026-10-10). Refresh that reference if the upstream UI moves the control.

Save the agreed direction in `intro.tsx` under `overview.curation`. The `SystemCuration` type defines its fields. This is an authored summary, not a live agent activity feed. Content counts do not advance its stage or establish readiness.

```tsx
import type { SystemIntro } from '@/platform/app/data/types';

export default {
  overview: {
    curation: {
      stage: 'foundations',
      summary: 'A compact product kit using shadcn with Base UI.',
      nextStep: 'Review the theme and typography before selecting the first components.',
      sources: [{ label: 'shadcn builder', url: 'https://ui.shadcn.com/create' }],
      record: 'curation.md',
    },
  },
} satisfies SystemIntro;
```

Use `direction`, `foundations`, `components`, `prototype`, or `ready` for curation. Use `assessment` for existing-code assessment. Set the stage to the current review or work, after inspecting actual progress. Do not infer approval from elapsed time or file presence.

`record` names an existing file relative to this system’s `context/`, available through Context navigation. Optional `prototypeId` records a representative prototype by permanent ID; the regular usage section shows active prototypes assigned to this system. Stage, summary, next action, and sources remain authored context for agents; Overview does not display them.

Source URLs must use HTTP or HTTPS. Preserve accessible links to chosen presets and upstream material. A source list can include multiple libraries or tools. Local paths and package references belong in the curation record, not external links.

## Saved decisions

Use a system-owned context document for the agreed direction, intended first use, selected sources, resolved versions or revisions, adaptations, missing materials, and verification evidence. Preserve a supplied `design.md` as source guidance. Distinguish explicit values from proposed ones. Link the record from this system's agent instructions so future work can find it.

Keep the Overview summary short. Save detailed provenance and decisions once in the record. Update the summary and next action after each meaningful review or setup step. Opening an existing record resumes work without creating a second plan.

## Isolated shadcn preparation

Run from the Studio checkout:

Preparation supports active prototype systems and explicit maintenance of the Studio platform system. Overview onboarding remains limited to prototype systems. Follow contributor authority for any configuration save or integration.

```sh
pnpm prepare-shadcn <system-key> --preset <code-or-name-or-builder-link> --components button,input,dialog --design-md <local-file>
```

The command prepares a temporary Vite workspace and prints commands to install dependencies, inspect configuration and resolved presets, read component documentation, preview selected components, and generate them. It does not execute those commands or change Studio's configuration, components, theme, dependencies, or default. `--json` returns the plan for agent use. `--help` lists options.

Each shadcn-based system owns `components.json`. Omit `--preset` to reuse its style, icon library, registries, and other upstream settings. The command remaps its aliases and CSS destination into staging; it never reads a root configuration. The current scoped theme is copied as source material, not converted into a standalone visual preview. Adapted runtime components are not copied, so the generated dry-run is not a diff against them. The configuration describes upstream choices; authored themes and component adaptations remain the runtime source of truth.

Supply a new preset to initialize fresh upstream material. A saved system's base is preserved unless `--base` explicitly changes it; a new system defaults to Base UI. Radix is supported when selected. For HTTPS `ui.shadcn.com/create` builder links, preparation extracts the `preset` query parameter for the CLI and preserves the original link in the plan. Named presets and opaque codes pass through unchanged. Do not manually decode opaque codes. Component input is a comma-separated list of built-in shadcn names. General third-party registry installation remains an agent task using upstream tools.

`--design-md` copies a readable local document to staging as `DESIGN.md` and records its source path and SHA-256. For URL or pasted input, save a local copy first. This command preserves input; the [shadcn procedure](../skills/setup-design-system/references/shadcn.md) owns interpretation and theme/component adaptation.

After inspecting the resolved configuration, run the plan's `saveConfigCommand` (`pnpm prepare-shadcn <system-key> --save-config <workspace>`). This writes only the target system's configuration, mapping paths back to its own components, helpers, and stylesheet. It rejects a different target identity or configuration changes since preparation. It does not import code, styles, fonts, or packages, and does not preserve a complete theme in JSON. Save preset, font, design guidance, resolved versions, and adaptation details in the curation record too. Do not use source folders as CLI working directories; they are not standalone projects.

`curation-plan.json` records the target system identity and original configuration, selected inputs, installed CLI version, commands, configuration save command, and adaptation checklist. Preserve the resolved source details in the system's record before removing temporary material. The staging plan alone does not establish source reproducibility or compatibility.

Use the printed commands from the Studio checkout so they use its installed shadcn CLI. Review generated output before integration. Follow the [system contract](../README.md#runtime-boundaries) for imports, scoped themes, explicit tokens, and portals. Fonts and images follow the platform asset convention. The [curation procedure](../skills/setup-design-system/references/curated-libraries.md) owns the browser review loop and outcome verification.

Blocks can add composition files, hooks, and transitive components. Import the parts the prototype needs and adapt sample navigation to real interactions. Inspect component-generated CSS as well as stylesheets: chart series rules must target the owning theme and its local color mode. Keep shared browser state, such as sidebar cookies, isolated or replace it with local state.
