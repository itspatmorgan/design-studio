---
title: "Checks and fixes"
---

Checks help keep the shared studio consistent. Give your agent the warning or error so it can identify the cause.

## Where checks run

| Stage | Checks and effect |
| --- | --- |
| Before commit | Staged asset sizes and module checks can block the commit. Scope and Git identity checks report warnings. |
| Before push | Scope summary. It does not run the full build or block platform changes. |
| `pnpm build` | Manifest validation, module checks, type checking, and the production bundle. |
| `pnpm test` | Focused platform and enabled-module regression tests. |
| `pnpm test:release` | All regression tests, including disposable setup/production fixtures. |
| `pnpm test:changed <base> <head>` | Execute affected regression groups. Add `--plan-only` to inspect selection or `--full` to force all tests. |
| `pnpm build:release` | Full regression suite followed by the production build. |
| `pnpm build:inspect` | Validate emitted asset references and report initial JavaScript/CSS size and request count. |
| `pnpm format` / `pnpm format:check` | Format upstream code, JSON and CSS with Biome, or check that it is formatted. Team and seed paths, generated files and `studio.config.ts` are excluded. CI runs the check. |
| `node src/platform/node/check/upgrade-test.js <base> <head>` | Create a studio from `<base>`, make typical team changes, update it to `<head>`, and require a clean merge, `pnpm check`, and `pnpm build`. Add `--keep` to inspect the result. |
| GitHub pull request | Scope review, asset sizes, selected regressions, production build, and the upgrade test. Platform proposals are flagged for review. |
| Push to `main` | Scope authorization, asset sizes, selected regressions, and production build. Platform changes require an admin or maintainer role. |

Ordinary builds use the same command in source clones and packaged studios. Publishing does not rerun maintainer regressions. The upstream **Checks and deployment** workflow (`.github/workflows/checks.yml`) runs **Selected regressions**, **Production build**, and `scope` concurrently; its required `build` check succeeds only when the production build and regression job both succeed. An authoring-only regression job succeeds after reporting that no platform tests are needed. The `scope` check remains independently required. Pages deployment on upstream `main` waits directly for scope, tests, and bundling to succeed. The `build` summary runs alongside deployment, avoiding another runner on the deployment dependency chain. The required check names `scope` and `build` remain stable. Copies choose their own CI and publishing policy.

The **Upgrade test** job proves that a customized studio can take the change. It updates a studio made from the pull request's merge base, with a new contributor, a system that declares its own package, a prototype, a local module, changed settings, and an edited README. Generated files are regenerated, seed files keep the studio's copy, and any other conflict fails the job.

Keep tests for failure-prone behavior and boundaries. Use synthetic fixtures instead of asserting the starter's sample content or visual token choices. Production integration tests end in `.integration.test.js` and run in the release tier. Optional module tests disappear with their module; plugin tests run only when the distribution source is present.

See [Personal & team use](/documentation/manual/team) for how these checks fit the workflow. Configure branch protection and required checks to enforce the team's merge policy.

The platform contract snapshot (`src/platform/core/contract.snapshot.json`) records the module entrypoints, `core/api.ts` exports, `ModuleSpec`, `SystemSpec` and `SystemLibrary` fields, runtime package lists, and `PLATFORM_VERSION`. `pnpm contract` and the upstream regression suite fail if the contract changes while `PLATFORM_VERSION` stays the same: bump the version, then run `pnpm contract --update`. A studio's own `pnpm check` and `pnpm build` do not run it, so local platform edits are never asked to change the version. If the version changed but the snapshot did not, run `pnpm contract --update` alone.

## Minimum sufficient verification

Choose checks by changed behavior and dependencies. Do not rerun unrelated setup or distribution tests for ordinary authoring. Scope, ownership, permanent identity, asset sizes, harness consistency, metadata, dependency boundaries, types, production compilation, and output inspection remain required in CI. Tests and the production build run concurrently; deployment reuses that build output.

The reviewed dependency map is `src/platform/node/check/test-groups.json`. Each retained test belongs to a group. `src/platform/node/check/test-selection.js` follows local transitive imports and supplements them with explicit source patterns for subprocesses, fixture reads, and globs. Patterns describe dependencies, not just the folder containing a test.

| Group | Purpose and indirect dependencies |
| --- | --- |
| Runtime | Platform/module behavior, Studio UI, identity, permissions, source editing, and documentation readers. Platform, module, build, and shared script implementation selects this group. |
| Setup | Configuration, onboarding, registration, system creation, and legacy identity CLI migration. Shared core declarations, setup helpers, CLI code, and relevant module Node implementations select this group. |
| Publishing | Disposable production builds verify runtime boundaries and disabled-capability exclusion. Build machinery, routing, shared core declarations, module registration, and source discovery select this group. |
| Distribution | Plugin bootstrap, packaging, manifests, toolchain, and benchmark tooling. Plugin machinery and shared harness/skill inputs select this group. |

Prototype content, non-Studio system content, contributor profiles, and public assets need production checks, without rerunning platform regressions. Studio's own system (`src/platform/systems/studio/`) is application code and selects runtime tests. Mixed changes take the union of affected groups. Both paths of renames participate. Removed non-authoring files, unknown paths, unclassified tests, dependencies, infrastructure, configuration, and selection machinery trigger the full suite. Missing or invalid Git comparison data also triggers the full suite. An empty retained test inventory fails verification.

Use `pnpm test:changed <base> <head> --plan-only` to inspect the same decision locally. Pass `--merge-base` for a branch comparison; pull-request CI does this automatically. When the head is the current checkout, local selection also includes staged, unstaged, and untracked files. Execution propagates selected test failures. Add `--full`, run `pnpm test:release`, or manually dispatch **Checks and deployment** with **full_checks** to run every group. Reusable workflows accept that same boolean input. Manual runs validate without publishing.

CI reports the groups, test-file count, and path reasons in the run summary. It plans before installing dependencies and skips regression dependency installation when no group is selected. The required names `scope` and `build` stay stable. A selector failure blocks the regression job and deployment rather than counting as an intentional omission.

When adding tests, register their group and review transitive and indirect dependencies. Unknown tests run in the full suite until classified. Optional module and plugin removal removes their absent tests from discovery. Verify the selector with authoring, platform, shared helper, setup, packaging, rename, unknown, and failure cases when changing its rules. Measure CI timing after rollout; local timing does not establish provider queue or hosting latency.

## Respond to a check

| Message | Next step |
| --- | --- |
| Platform files changed | Confirm authorization and use the maintainer's review process. |
| Git identity differs | Ask your agent to compare Git settings with your contributor registration. |
| Import crosses a boundary | Ask your agent to use a permitted dependency. |
| Styles escape their scope | Ask your agent to contain the selector or use a CSS Module. |
| File exceeds the size limit | Reduce the asset before committing. |
| Type check fails | Give your agent the error and ask it to correct the code. |

See [Personal & team use](/documentation/manual/team) for review paths and [Prototype files and boundaries](/documentation/context/module.prototypes#dependency-boundaries) for permitted dependencies.

## Keep files small

The [Asset Guard](assets.md#asset-guard) blocks oversized files before commit and in CI. Its convention defines the size limit and exception handling.

Follow the guard’s linked guidance to reduce a flagged asset before committing.

## Protect the shared repository

This setup is the studio maintainer's responsibility.

Personal studios skip team ownership checks, using the before-side configuration. Declaration, dependency, and asset checks still run. A proposed switch from team to personal cannot bypass team review.

Resource identity checks run before that personal-mode exception. They inspect committed trees or staged blobs rather than trusting the working tree. Permanent IDs cannot be replaced or removed in place, retained prototype owners cannot change through a source edit, and an identified artifact cannot transfer between prototypes without an explicit transfer policy. Moves within the same prototype and fresh identities for copies are supported. Identity errors fail CI even when platform review is requested; local hooks report them for correction.

Pull requests in team studios run checks and flag changes outside the contributor’s assigned scope for review. Direct pushes accept prototype ownership, assigned active system work, and studio Admin authority from the before-side configuration and profiles. Proposed identity or grant changes cannot authorize themselves. Repository `admin` and `maintain` accounts can also make shared changes.

These checks do not prevent an unauthorized Git push by themselves. Configure GitHub branch protection, required checks, and the team's review process.
