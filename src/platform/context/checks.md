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
| `pnpm build:release` | Full regression suite followed by the production build. |
| `pnpm build:inspect` | Validate emitted asset references and report initial JavaScript/CSS size and request count. |
| `pnpm format` / `pnpm format:check` | Format upstream code, JSON and CSS with Biome, or check that it is formatted. Team and seed paths, generated files and `studio.config.json` are excluded. CI runs the check. |
| `pnpm studio update [version]` | Take an upstream release on its own branch, then run `pnpm check` and `pnpm build`. See [Updating a studio](ownership.md#updating-a-studio). |
| `node src/platform/node/check/upgrade-test.js` | Rehearse the actual update command using isolated synthetic releases and a customized studio. Checks dry-run invariants, complete ownership and receipt preservation, conflict/continue, failed-check reporting, and frozen install/check/build. Use `--working` before committing, `--from <public-tag>` for a supported source release, and `--keep` to inspect fixtures. |
| GitHub pull request | Scope review, asset sizes, ordinary regressions, and one production build. Platform proposals are flagged for review. |
| Push to `main` | Scope authorization, asset sizes, regressions, and production build. Platform changes require an admin or maintainer role. |

Ordinary builds use the same command in source clones and installed studios. Publishing does not rerun maintainer regressions. CI requires `scope` and `build`; the latter includes ordinary regressions and production compilation. Explicit full checks also require upgrade acceptance in the upstream repository. A failed, cancelled, or unexpectedly skipped required job fails the gate. Copies choose their own CI and publishing policy.

The [checks workflow](../../../.github/workflows/checks.yml) defines job dependencies. [Releasing](releasing.md) owns candidate acceptance; [project publishing](releasing.md#project-repository-publishing) owns this repository's deployment.

Keep a small suite for critical infrastructure, data integrity, stable behavioral contracts, and consequential regressions. Use synthetic fixtures instead of asserting the starter's sample content, generated source spelling, or visual token choices. Ordinary development uses type checks, builds, and targeted runtime verification for presentation and incidental behavior. Consolidate shared fixtures only when this removes maintenance work; preserve distinct authority, identity, rollback, and race-condition failures. Validate proposed redundancy with targeted mutations when a replacement must catch the same fault. Production integration tests end in `.integration.test.js` and run only in the release tier,  Critical identity, authority, rollback, collision, and copy-cleanup contracts remain covered by ordinary tests. Optional module tests disappear with their module.

See [Personal & team use](/documentation/manual/team) for how these checks fit the workflow. Configure branch protection and required checks to enforce the team's merge policy.

## Ownership map

See [Ownership and updates](ownership.md#path-map) for path tiers, unlisted files, and strict upstream validation. This check reads tracked paths and the ownership map, independently of contributor scope. A non-Git folder skips it.

## Platform contract

The platform contract snapshot (`src/platform/core/contract.snapshot.json`, schema 1) records the public API's semantic signatures and stability, referenced local types, generic parameters, readonly modifiers, nested shapes, runtime package lists, stored format versions, and Node, pnpm, React, and React DOM requirements. TypeScript provides signatures without implementation bodies or comments. A referenced public type retains its explicit stability; other local types inherit the declaration that exposes them.

`pnpm contract` checks export annotations and requires the snapshot to match current source. Run `pnpm contract --update` after a reviewed surface change. This command does not decide release compatibility. Earlier pre-release APIs and snapshot schemas are not supported compatibility baselines.

The first supported public release is `v0.1.0`. `src/platform/node/lib/release-versions.js` declares that baseline. Updates, compatibility checks, and CI share this selection policy. `pnpm contract --released` independently reads the preceding supported release tag's snapshot. It excludes the candidate’s own tag only when its version and clean commit match. A tagged HEAD remains the baseline during uncommitted release edits. The initial public candidate can establish its baseline without a preceding public tag; later candidates fail clearly when that history is missing. Fetch complete history and release tags for this maintainer check.

After public launch, a stable signature, referenced stable type, runtime requirement/package list, or stored format version change requires a minor version increase under the 0.x policy. Experimental changes remain recorded and may change within 0.x. Updating the editable snapshot cannot authorize a change against the released baseline. `pnpm contract --released --base <revision>` also reports the PR-base snapshot differences for review; this report imposes no compatibility with historical pre-release snapshots.

Upstream CI runs the released comparison and PR report. The release command runs the released comparison after refreshing its snapshot. A studio's normal `pnpm check` and `pnpm build` do not impose upstream version bumps on local platform changes.

## Minimum sufficient verification

Choose checks by changed behavior and dependencies. Do not rerun unrelated setup or production integration tests for ordinary authoring. Scope, ownership, permanent identity, asset sizes, harness consistency, metadata, dependency boundaries, types, production compilation, and output inspection remain required in CI. Tests and the production build run concurrently; deployment reuses that build output.

Tests are discovered directly under the platform and registered module roots. Ordinary CI runs `pnpm test`; explicit full checks run `pnpm test:release`. Optional module removal removes its tests from discovery. An empty test inventory fails verification. No catalog or change-selection rules need maintenance.

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

[Contributor scope](contributor-scope.md) defines authority and before-side review rules. Personal use skips team scope checks, but declaration, dependency, asset, and permanent-identity checks still apply. A proposed usage or grant change cannot authorize itself.

Identity checks inspect staged or committed source and protect [retained identities and containment](resource-identity.md#direct-authoring-and-verification). Identity errors fail CI even for reviewed proposals; local hooks report them for correction.

These checks do not prevent an unauthorized Git push by themselves. Configure GitHub branch protection, required checks, and the team's review process.
