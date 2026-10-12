# Changelog

## Unreleased

- Restore the ongoing public demo links to the existing custom-domain GitHub Pages deployment. ChatGPT Sites is an optional publishing-workflow demonstration.

## 0.3.0 (2026-10-11)

- Public setup uses the v0.3.0 repository guide without a plugin installer, with explicit Codex, Claude Code and Cursor workspace entry points and recovery that preserves interrupted setup. ChatGPT Sites publishing is validated with an isolated demonstration; teams retain the portable static build for their own hosts. Publishing guidance covers same-Site updates and the provider's missing-asset SPA fallback limitation.

- Removed the pre-release bulk identity/relationship/link conversion commands, legacy ownership and guidance-link readers, obsolete skill-directory repair, the unused curation URL helper, and the unused root `tailwind-merge` dependency. Scoped identity assignment, current permissions, canonical source links, scaffold roots, and team adapter preservation remain supported.

- Update acceptance now runs the actual CLI in isolated release/studio repositories: dry-run invariants, complete seed/team/dependency/receipt preservation, exact merge stamping, conflict/continue, frozen builds, and failed-check reporting. The required build gate depends on upgrade success for upstream PRs and explicitly permits intentional omissions elsewhere. Updates require shared release ancestry; legacy history joining and metadata-only success are removed. Planning requires valid ownership maps, protects prior seed/team tiers, and retains literal whitespace paths.

- Contract snapshots now record semantic export signatures, generic parameters, nested and referenced types, readonly/optional fields, class constructors, and Node/pnpm/React runtime requirements. CI reports PR-base changes and independently compares against supported public tags; the release command uses the same comparison. Public compatibility begins at v0.3.0, with no legacy snapshot reader or historical pre-release gate. Refreshing a future snapshot cannot hide a stable change requiring a 0.x minor release.

- `#studio/module` now loads the platform version safely in Node. Browser app contribution types (`ModuleApp`, `PaletteContext`, `PrototypeAction`) move to `#studio/ui`. Studio identity values (`APP_NAME`, `TAGLINE`, read-only `CONFIG`) move to browser-only `#studio/data`, which also exports the documented experimental `contribution()` reader. Shipped callers and scaffolds use the new entry. `ModuleApp.landing` is stable, and supplied modules require platform 0.3.0 for their current declarations and APIs.

- Physical module removal now excludes instruction links into absent module owners while retaining missing-file errors for installed owners. Availability baselines use registered fixture authority, independent Git history, and linked workspace dependencies. Release regressions build the enabled control and all six optional modules disabled and removed; Manual repair coverage lives with Documentation.
- Module import checks now normalize discovered module directories, enforcing optional-module boundaries for static, dynamic, and type-only imports. The shared Documentation header reads the enabled module’s landing contribution instead of importing Manual implementation.
- Updates apply ownership to clean merges as well as conflicts. Existing seed and team files keep their complete studio copy or deletion, including unchanged seeds removed upstream. New seed paths take the release's copy, generated paths take the release before regeneration, and mixed dependency conflicts remain for review. The upgrade fixture verifies full protected files, file inventories, and team-added root dependencies.
- The app reads the Manual from `manifest.contributions.documentation` and `Manifest.manual` is gone. The shell no longer knows the Manual: its palette group comes from `ModuleApp.palette`, the `/documentation` landing from `ModuleApp.landing` (stable), palette group order from `ModuleApp.paletteOrder`, and Studio settings groups from `ModuleSpec.settings`. `PLATFORM_VERSION` is `0.3.0` for these declaration fields. Nothing changes in the interface, and the studio builds and checks with Documentation disabled.
- A module can add an optional `build.ts` (`ModuleBuild`, experimental in `#studio/module`) that contributes data to the manifest as `manifest.contributions[<id>]`, folders to watch, and editable source files. The Documentation module now scans the Manual through it; the Manual and its pages behave as before.
- Before the first public baseline, CI rehearses upgrades between sibling candidate revisions, preserving complete team/seed copies and applying an incoming upstream change. Historical pre-release APIs are not a compatibility gate.

## 0.2.1 (2026-10-11)

- The upgrade test now starts from the latest release.
- Installation now follows one release-pinned path, with the same instructions for people and their agents. The README and Manual explain agent harnesses, private or company repositories, optional updates, and separate static-site publishing without promoting plugins.
- The onboarding illustration centers its example button label.

## 0.2.0 (2026-10-11)

- `studio.config.json`, each prototype's `meta.json`, and each contributor's profile declare `"formatVersion": 1`, kept in `FORMAT_VERSIONS` and the contract snapshot, so the first format change after release can migrate from a known version. A missing or unknown version is an error naming the file; `pnpm new`, `pnpm join`, and settings writes stamp or keep it. A pre-release studio adds `"formatVersion": 1` to its settings, contributors, and `meta.json` files. The ownership map must have no conflicting rules (`pnpm check`), and the upstream project's CI also requires every path to be named; in a studio an unlisted path is team-owned. Every test file is type-checked under `tsconfig.test.json`.
- The setup plugin, its host catalogs, and SETUP.md moved to [design-studio-plugin](https://github.com/itspatmorgan/design-studio-plugin). The starter no longer ships plugin files, and `pnpm harness:sync` and `pnpm harness:check` are replaced by `pnpm studio sync` and `pnpm studio sync --check`.
- Upstream code is formatted with Biome; `pnpm format:check` runs in CI.
- `.studio/ownership.json` and `pnpm ownership` map every path to an owner tier, and an upgrade test proves a customized studio can take a newer upstream revision.
- The Node tooling moved from `scripts/` to `src/platform/node/`, so `src/platform/` is the single upstream-owned root. Paths in `package.json`, hooks, and workflows changed; behavior did not.
- Studio's own interface system moved from `src/systems/studio/` to `src/platform/systems/studio/`. Systems are now found in two roots, the supplied `src/platform/systems/` and the team's `src/systems/`, so `src/systems/` holds only the team's systems. URLs, the system's ID, and behavior did not change.
- The supplied modules moved from `src/modules/` to `src/platform/modules/`. Modules are now found in two roots, the supplied `src/platform/modules/` and the team's `src/modules/`, so `src/modules/` holds only the team's modules; a team module can't reuse a supplied module's ID. Module IDs, URLs, and behavior did not change. A team system that imports `../../modules/systems/spec.ts` now imports `SystemSpec` from `#studio/system` (below).
- Studio settings moved from `studio.config.ts` to `studio.config.json`, plain JSON with a JSON Schema (`src/platform/core/studio.config.schema.json`) that editors use to validate it, and every tool reads and writes it as JSON, changing only the settings you edit. `systems` no longer lists Studio, which is always available, and listing it is an error. A pre-release studio copies its values into the new file and deletes the old one.

- The sample prototypes now belong to a neutral "Studio Samples" contributor (`contributors/samples.json`, marked `"sample": true`) in `src/prototypes/samples/`, instead of the maintainer's own profile, and the seed `studio.config.json` lists no Admins (a personal studio gives every contributor Admin rights; team use needs `--admins`). Prototype IDs did not change.
- `AGENTS.md` is now generated by `pnpm studio sync` from the upstream guidance in `src/platform/AGENTS.md`, the enabled modules' routing, and a team-owned `AGENTS.team.md`, so updates never conflict on it and teams have their own place for agent guidance.
- Prototypes now import only React and React DOM by package name. Icons come from the assigned system's `libraries/icons.ts` entry (declared in `system.ts` `libraries`; the sample systems re-export `lucide-react`), and `Link` and `useNavigate` come from `@module/prototypes` and take prototype-relative paths. A direct `lucide-react` or `@tanstack/react-router` import in a prototype is an error in `pnpm check` and the dev server. A pre-release studio repoints its own prototypes' imports the same way.
- Team modules and systems are written against a public API, `src/platform/api/`, imported as `#studio/module`, `#studio/system`, `#studio/files`, `#studio/data`, `#studio/ui`, and `#studio/components` through the root `package.json` `imports` field. Each export is tagged `@stable` or `@experimental` and recorded in the contract snapshot. Importing any other platform path from `src/modules/` or `src/systems/` is now an error in `pnpm check` and the dev server, including `src/platform/node/`; `MODULE_PLATFORM_ENTRIES` and `src/platform/core/api.ts` are gone, and supplied modules are no longer bound by the boundary. Every module must declare `requires`; the public release foundation is platform `0.3.0`. Team modules and systems use the current public entries and matching requirements.
- Maintainers cut a release with `pnpm release <version>`, which sets `PLATFORM_VERSION`, refreshes the contract snapshot, dates this changelog's `## Unreleased` section, runs the checks, and commits and tags `v<version>` locally without pushing ([Releasing](src/platform/context/releasing.md)). A module made with `pnpm studio create-module` now requires the platform version it was made with.
- `studio.lock.json` records the upstream release a studio is on, `"platform": { "version", "commit" }`, written by `pnpm studio update` and the installer. The lock is team-owned. The starter ships no platform entry; a studio without one is on an unknown release and updates from Git's merge base.
- `pnpm studio update [version]` takes a Design Studio release into a studio: it fetches the release tags from the `upstream` remote, merges the release on a new `studio-update/v<version>` branch with the ownership rules, records it in `studio.lock.json`, and runs `pnpm check` and `pnpm build`. `--dry-run` previews the release and the overlapping files, and `--continue` finishes an update after its conflicts are resolved. It never pushes. The upgrade test in CI starts from the latest release tag once one exists.

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
