---
name: configure-studio
description: "Configure a running studio for the first time or update requested studio settings. Use setup-contributor for someone joining; installation has its own workflow."
---

## Scope and input

Use this skill when someone is ready to configure a running studio. The first-run install and launch steps are in the [public setup instructions](https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md); do not make configuration a prerequisite for launching the starter. Preserve existing work and confirmed choices.

Read [contributor scope](../../context/contributor-scope.md), [manage-modules](../manage-modules/SKILL.md), and the relevant [configuration contract](../../context/config.md) sections. Run `pnpm studio status --json` and inspect current configuration.

Distinguish initial configuration from a settings update. Missing dependencies or a stock name do not establish initialization intent. Collect only unresolved choices needed for the requested work. Initial configuration can include identity, personal or team use, toolkit materials, and supplied product context.

## Prepare and configure

1. Inspect the affected contributors, systems, and prototypes. Resume from actual state rather than restarting completed setup.
2. If registration is needed, follow [setup-contributor](../setup-contributor/SKILL.md) in **registration-only mode**. Return here after identity verification.
3. Preview requested choices with `pnpm studio configure`. Enable Contributors & Permissions before switching to team use, and provide registered Admin keys with `--admins key,key`. Preserve existing grants when resuming. Use `--recovery` only for authorized initial setup without an Admin or permission recovery. Apply confirmed choices with `--yes`; the command validates configuration and preserves existing prototype assignments. Restart the server as required.
4. If the person wants to curate or import a kit now, follow [setup-design-system](../../../modules/systems/skills/setup-design-system/SKILL.md). Reuse its representative prototype for final verification. If they choose to explore with an installed starter, preserve that choice and continue without requiring a replacement system.
5. If supplied product context needs saving, use [maintain-context](../maintain-context/SKILL.md) in the selected product system. Preserve platform personas, principles, and skills. Keep unresolved materials explicit.

The setup-design-system skill owns system migration and starter cleanup. Do not perform a second cleanup here.

Do not create a remote, push, or configure hosting without a request. Personal local use needs no GitHub account.

## Verify completion

For initial configuration, reuse the setup prototype or create one with `pnpm new` and inspect a view with the chosen system. Exercise Documents or Canvases when they are part of the requested setup, using their skills; skip disabled capabilities.

For a settings update, verify the changed settings and affected navigation or system behavior. Do not create artifacts merely to verify a name, tagline, or permission change.

Run `pnpm studio status --json` to confirm configuration and identity. Follow [working context](../../context/working-in-studio.md) for build and save requirements. Inspect the affected local pages.

Use the UI for review when helpful. Save any context collected there in repository files.

Report completed choices, verified local links, and unresolved input. Leave the local app available. Missing materials block only the import or task that needs them. A usable studio with a chosen starter can complete initial configuration. Product context is curated when supplied; empty context and skills folders do not make setup incomplete.
