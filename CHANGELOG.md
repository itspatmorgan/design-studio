# Changelog

## Foundation

- The setup plugin, its host catalogs, and SETUP.md moved to [design-studio-plugin](https://github.com/itspatmorgan/design-studio-plugin). The starter no longer ships plugin files, and `pnpm harness:sync` and `pnpm harness:check` are replaced by `pnpm studio sync` and `pnpm studio sync --check`.
- Upstream code is formatted with Biome; `pnpm format:check` runs in CI.
- `.studio/ownership.json` and `pnpm ownership` map every path to an owner tier, and an upgrade test proves a customized studio can take a newer upstream revision.
- The Node tooling moved from `scripts/` to `src/platform/node/`, so `src/platform/` is the single upstream-owned root. Paths in `package.json`, hooks, and workflows changed; behavior did not.
- Studio's own interface system moved from `src/systems/studio/` to `src/platform/systems/studio/`. Systems are now found in two roots, the supplied `src/platform/systems/` and the team's `src/systems/`, so `src/systems/` holds only the team's systems. URLs, the system's ID, and behavior did not change.
- The supplied modules moved from `src/modules/` to `src/platform/modules/`. Modules are now found in two roots, the supplied `src/platform/modules/` and the team's `src/modules/`, so `src/modules/` holds only the team's modules; a team module can't reuse a supplied module's ID. Module IDs, URLs, and behavior did not change. A team system that imports `../../modules/systems/spec.ts` now imports `../../platform/modules/systems/spec.ts`.
- Studio settings moved from `studio.config.ts` to `studio.config.json`, plain JSON with a JSON Schema (`src/platform/core/studio.config.schema.json`) that editors use to validate it, and every tool reads and writes it as JSON, changing only the settings you edit. `systems` no longer lists Studio, which is always available, and listing it is an error. A pre-release studio copies its values into the new file and deletes the old one.

## Portable setup preparation

- One experimental plugin package exposes the same create, open, and use skills to Codex, Claude Code, and Cursor through generated host manifests.
- Direct setup provides a request for the coding agent to handle downloading and opening the studio without a manual clone.
- Claude's entry point imports the shared repository instructions. Existing personal guidance is preserved.
- Experiment .10 installs a tested integration snapshot with Welcome onboarding, shared harness guidance, and Check Design System. Native host journeys and public distribution remain release gates.

## Welcome onboarding

- A default-enabled, optional Onboarding module welcomes people on their first local home-page visit, with a short interactive dialog introducing systems and prototype artifacts, sample prototypes, and guidance for making a prototype or setting up a system with their agent.
- People can step through the introduction or skip it. Dismissal is remembered in the browser; onboarding has no navigation destination.
- Welcome is independent of installation and is omitted from published viewing sites.
- The command menu groups Places, Systems, Prototypes, and Manual in that order, without individual platform instruction files or system-content files.

## Context and Skills foundation

- Platform, modules, and systems own their README, context, and task skills beside their implementation. Standing requirements are context; separate Rules folders have been removed.
- Documentation provides a readable platform and module instruction browser, with consistent document titles and navigation that preserves its scroll position. System guidance stays in Systems.
- The Manual includes an Agents section written for designers and product managers.
- Project skill entries expose canonical procedures to Codex, Cursor, and Claude Code. Synchronization preserves user-owned changes.
- An experimental local plugin creates, opens, and uses a studio in a visible user-owned folder. Public plugin submission, clean-computer setup, and native Claude Code and Cursor activation remain follow-up testing.
- Compatibility redirects retain saved links to relocated guidance.

## Beta preparation

The current starter includes:

- Personal studio setup and contributor onboarding for shared studios.
- Prototypes with views, documents, diagrams, and Excalidraw canvases.
- Local file management, source editing, ordering, and per-view lo-fi mode.
- Prototype archiving that excludes archived work from the published site.
- Separate platform and prototype design systems, with component examples and token pages.
- Shared product context and agent guidance, including setup and documentation skills.
- Modules live alongside systems and platform infrastructure, with scaffolding and installation previews.
- A required Studio system supplies application components and guidance; prototype systems remain separate.
- Supported module entrypoints have dependency checks, and the Manual explains customization and upstream updates.
- Contributor scope, import boundaries, scoped-style checks, and file-size checks.
- The Feedback Inbox sample, with an introduction, exploration artifacts, screens, and states.

Dated release entries will follow published releases.
