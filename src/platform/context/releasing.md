---
title: Releasing
description: How the upstream maintainer cuts a platform release, what the release script does, and how the tag is pushed.
toc: true
---

A release is a tagged commit on the upstream `main`, named `v<version>`. Studios update to release tags with `pnpm studio update` ([Updating a studio](ownership.md#updating-a-studio)), so a tag is a promise: the platform at that commit passes its checks, its CHANGELOG entry says what changed, and its `PLATFORM_VERSION` matches the tag. This document is for the upstream maintainer; a studio never releases.

## Versions

`PLATFORM_VERSION` (`src/platform/core/modules/index.ts`) is the version of the public contract, and the tag uses the same number. While the version is `0.x`, raise the minor version when a stable export, a declaration type, a runtime package list, or a stored format version changes (the contract check requires it), and the patch version otherwise. A module's `requires` names the oldest version it works with; a module created with `pnpm studio create-module` requires the version it was created with, so a release never edits the module template. The supplied modules keep the `requires` they declare.

## Cut a release

1. Merge everything the release includes into `main`, and make sure each change has a line under `## Unreleased` in `CHANGELOG.md`.
2. On a clean `main` that matches `origin/main`, preview the release:

   ```sh
   pnpm release 0.2.1 --dry-run
   ```

   The dry run prints the version change, the changelog heading, the checks, the commit and tag it would make, and the release notes, and changes nothing. It lists every reason the release can't go ahead.
3. Cut it:

   ```sh
   pnpm release 0.2.1
   ```

4. Review the commit and the tag, then push both together with the command the script prints:

   ```sh
   git push --atomic origin main v0.2.1
   ```

The release commit goes to `main` directly, so the person pushing needs the right to push to `main`.

## What the script does

`pnpm release <version>` (`src/platform/node/cli/release.js`, logic in `src/platform/node/lib/release.js`):

- Requires a valid semver version that is greater than or equal to the current `PLATFORM_VERSION`. Equal is allowed, so a version bumped during development (the first release, `0.2.0`, was set before it was cut) is released without another bump. A leading `v` is accepted.
- Refuses unless the checkout is on `main` with no uncommitted or untracked changes and matches `origin/main` after a fetch, the `## Unreleased` section exists and has notes, and neither the checkout nor `origin` has the tag yet.
- Sets `PLATFORM_VERSION` and runs `pnpm contract --update`, so the contract snapshot records the version.
- Renames `## Unreleased` to `## <version> (<YYYY-MM-DD>)`, using the local date, and starts a new empty `## Unreleased` section above it.
- Runs `pnpm check`, `pnpm contract`, and `pnpm build`. If any step fails, or a step changes a file other than the three the release edits, it restores those files and stops with nothing committed.
- Commits `Release v<version>` and creates the annotated tag `v<version>`, whose message is the release notes.
- Never pushes. It prints the push command.

## After pushing

The upgrade test in CI starts from the latest `v*` tag ([Checks and fixes](checks.md)), so every later pull request proves that a studio on the last release can take it.

If a release is wrong after it is pushed, cut a new patch release rather than moving or deleting the tag: studios may already have updated to it.

## Related contracts

- [Ownership and updates](ownership.md) defines how a studio takes a release.
- [Checks and fixes](checks.md) defines the contract check and the upgrade test.
- [Format versions](formats.md) defines when a format change needs a version bump.
