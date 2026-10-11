---
title: Format versions
description: The version stamped in each stored format, how it is validated, and where the first migration will go.
toc: true
---

Some files hold the team's work and outlive any one release: the studio's settings, each prototype's metadata, and each contributor's profile. Each declares the version of its format as a top-level `formatVersion`, so the first format change after release can upgrade files it recognizes by their version instead of guessing from their shape.

## Versioned formats

| Format | File | Version field | Validator |
| --- | --- | --- | --- |
| Settings | `studio.config.json` | `formatVersion` | `configProblems` in `src/platform/core/config.ts` |
| Prototype metadata | `meta.json` in each prototype and section item | `formatVersion` | `readPrototype` in `src/platform/node/build/build-manifest.js` |
| Contributor profile | `contributors/<key>.json` | `formatVersion` | `readContributors` in `src/platform/node/lib/contributors.js` |

The current versions are one exported constant, `FORMAT_VERSIONS` in `src/platform/core/formats.ts`. The platform contract snapshot records it, so a version change is visible in review. The settings schema lists `formatVersion` as required and as the first property after `$schema`, and `CONFIG_KEYS` keeps it in that place.

The other stored formats do not take the field, each for a reason:

- A canvas is an Excalidraw scene, so its top level belongs to Excalidraw. It already carries `studioVersion`, which a newer copy of the app reads as "open it, never save over it". Canvas keeps that field.
- Documents and diagrams are Markdown and Mermaid text. A leading comment or frontmatter carries their identity, and nothing about them is a Studio-defined structure that needs upgrading.
- `.studio/ownership.json` has `schema`, and `studio.lock.json` has `lockfileVersion`; both predate this field and are read and written only by upstream tooling.
- `module.ts` and `system.ts` are code declarations. Compatibility is declared with `requires` and `PLATFORM_VERSION`, and the contract snapshot records the declaration types.

## Validation

A file with no `formatVersion`, or a value other than the current version, is a validation error that names the file. `pnpm check` reports settings and contributor files, and the manifest build reports a prototype. An error says whether the file was written by a newer studio.

Writers keep the field. Settings writes are read-modify-write of the parsed file, so the field stays where it is. Creation writes the current version: `pnpm new` and the New prototype button (from the template), `pnpm join`, and fixtures. Registering a system changes `studio.config.json` and keeps its version.

Before the first release, every checked-in file and fixture is stamped and there is no migration. A pre-release studio adds `"formatVersion": 1` by hand; the upgrade test does the same in its `PRE_RELEASE_TRANSITIONS` (`src/platform/node/check/upgrade-test.js`).

## Where a migration goes

There is no migration registry yet, because there is nothing to migrate from. When a format first changes after release:

1. Raise its entry in `FORMAT_VERSIONS` and bump `PLATFORM_VERSION`, since the contract snapshot changes with it.
2. Add the migration beside the validator that reads the format. It takes a file at version N and returns the file at N + 1, and it is the only code that reads version N. Chain the steps from the file's version up to the current one.
3. Run migrations in an explicit command, such as a `pnpm studio` subcommand with a preview and `--yes`, as other source migrations do. Builds and ordinary saves never rewrite a file to a new version.
4. Make the validator accept the previous version only to point at that command. Anything else stays an error.
5. Name the step in the release notes and add the new version to a fixture so the upgrade test covers it.

Keep each migration's input check strict. A file with an unknown future version is refused, never guessed at.

## Related contracts

- [Studio configuration](config.md) defines `studio.config.json`.
- [Resource identity](resource-identity.md) defines the permanent IDs the same files carry.
- [Ownership and updates](ownership.md) defines how seed and team files change during an update.
