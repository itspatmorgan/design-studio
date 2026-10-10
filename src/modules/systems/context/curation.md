---
title: System curation
description: Overview as the home base for directing, reviewing, and resuming system setup.
---

## Overview summary

Local active prototype systems offer setup from Overview, even after content arrives. Empty systems show the starting choices directly. Populated systems without a saved curation summary offer **Curate or bring in a system**. Studio and archived systems have no setup controls. Published sites omit the curation panel.

Setup uses three stacked Overview blocks on one page: **Starting point**, **Your choices**, and **Your prompt**. All remain visible, with the selected tab controlling the choices and generated prompt. Each uses the Overview muted surface, subtle border, padding, and heading style. The handoff is: choose a starting point with Studio Tabs, describe inputs, then copy and send the visible prompt in the agent chat. The curated paths ask what the person wants to build and any components they already want, so the agent can select the first useful kit. The existing React path asks for a repository URL or full local project folder path. These inputs are kept separately for each starting point while the page is open. The agent requests files in chat only as needed for the next step. These draft inputs are not persisted. The shadcn starting path links to its upstream builder. An optional preset code or builder link is included in copied instructions. This field does not save or install anything. Untitled UI retains an agent-assisted curation path. **Your React system** starts an assessment, not an import.

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

Use `direction`, `foundations`, `components`, `prototype`, or `ready` for curation. The final stage displays **Refine**. Use `assessment` for existing-code assessment. Set the stage to the current review or work, after inspecting actual progress. Do not infer approval from elapsed time or file presence.

Overview links to available colors, typography, assets, and up to three documented component examples. `record` names an existing file relative to this system's `context/`. Its **Saved decisions** link appears only when the file is discovered. Optional `prototypeId` selects a representative prototype by permanent ID. Only active, runnable prototypes assigned to this system appear. These links use the system's permanent browser address.

Source URLs must use HTTP or HTTPS. Preserve accessible links to chosen presets and upstream material. A source list can include multiple libraries or tools. Local paths and package references belong in the curation record, not external links.

## Saved decisions

Use a system-owned context document for the agreed direction, intended first use, selected sources, resolved versions or revisions, adaptations, missing materials, and verification evidence. Preserve a supplied `design.md` as source guidance. Distinguish explicit values from proposed ones. Link the record from this system's agent instructions so future work can find it.

Keep the Overview summary short. Save detailed provenance and decisions once in the record. Update the summary and next action after each meaningful review or setup step. Opening an existing record resumes work without creating a second plan.

## Isolated shadcn preparation

Run from the Studio checkout:

```sh
pnpm prepare-shadcn <system-key> --preset <code-or-name> --base base --components button,input,dialog
```

The command prepares a fresh temporary Vite workspace and prints commands to install dependencies, initialize the selected preset, preview selected components, and generate them. It does not execute those commands or change Studio's configuration, components, theme, dependencies, or default. `--json` returns the plan for agent use. `--help` lists options. Base UI is the default. Radix is accepted when explicitly selected.

Extract the preset code from a builder link before preparation. Named presets such as `nova` are also accepted. Component input is a comma-separated list of built-in shadcn names. General third-party registry installation remains an agent task using upstream tools.

`curation-plan.json` records the target system identity, selected inputs, installed CLI version, commands, and adaptation checklist. Preserve the resolved source details in the system's record before removing temporary material. The staging plan alone does not establish source reproducibility or compatibility.

Use the printed commands from the Studio checkout so they use its installed shadcn CLI. Review generated output before integration. Follow the [system contract](../README.md#runtime-boundaries) for imports, scoped themes, explicit tokens, and portals. Fonts and images follow the platform asset convention. The [curation procedure](../skills/setup-design-system/references/curated-libraries.md) owns the browser review loop and outcome verification.
