---
title: Releasing
description: How the upstream maintainer cuts a platform release, what the release script does, and how the tag is pushed.
toc: true
---

A release is a tagged commit on the upstream `main`, named `v<version>`. Studios update to release tags with `pnpm studio update` ([Updating a studio](ownership.md#updating-a-studio)), so a tag is a promise: the platform at that commit passes its checks, its CHANGELOG entry says what changed, and its `PLATFORM_VERSION` matches the tag. This document is for the upstream maintainer; a studio never releases.

## Versions

`PLATFORM_VERSION` (`src/platform/core/modules/index.ts`) is the version of the public contract, and the tag uses the same number. The first supported public baseline is `v0.1.0`; historical pre-release versions impose no compatibility requirement. After that baseline, while the version is `0.x`, raise the minor version when a stable signature or referenced type, runtime requirement/package list, or stored format version changes, and the patch version otherwise. `pnpm contract --released` compares against the preceding supported release independently of the editable snapshot. A module's `requires` names the oldest version it works with; a module created with `pnpm studio create-module` requires the version it was created with, so a release never edits the module template. The supplied modules keep the `requires` they declare.

## Maintainer workspace and distributed source

The upstream starter tracks fictional sample contributors, examples, and systems. A maintainer's real contributor profile and personal prototypes remain local, excluded using `.git/info/exclude`. Personal mode gives the resolved registered maintainer Admin access; do not commit that profile's ID into shared configuration.

Run acceptance and cut releases from a separate clean clone on `main`, with full history and the upstream repository as `origin`. Install its pinned dependencies and run the checks below there. Do not copy the maintainer's local profiles, private prototypes, or existing build output into it. `node src/platform/node/check/check-starter.js` rejects local files even if Git ignores them. The release command checks this before making any changes and rechecks when applying a plan.

Upstream CI runs the same distribution check. The public website checks out the exact passing Studio commit in a fresh `studio-source` directory and builds there, so it does not use the maintainer's local files or `dist/`. Installed studios and their own publishing workflows may include real contributors; this is an upstream distribution policy only. Previous commits and tags retain their historical contents.

## 0.1.0 launch checklist

Publication remains on hold until the maintainer explicitly directs it.

- [x] Local acceptance: 547 tests, installation, updates, and production builds passed. Clean-computer setup remains unverified.
- [ ] Review the changelog and limitations with the maintainer and obtain publication direction.
- [ ] Push the approved candidate and pass upstream CI. Pushing main also deploys the public demo.
- [ ] Once the approved tag is available, update both installation prompts to `v0.1.0` in the website repository (`itspatmorgan/itspatmorgan.github.io`): `src/data/design-studio-setup.ts` and `src/data/design-studio-agent.txt`.
- [ ] Verify installation from the public tag and the deployed viewer's interactions, direct links, and reloads before announcement.

## Cut a release

Prepare the candidate and review its changes, release notes, checks, and limitations with the maintainer. Cutting the real release and publishing its commit or tag require the maintainer’s explicit direction. Candidate preparation and a dry run do not authorize publication.

1. Merge everything the release includes into `main`, and make sure each change has a line under `## Unreleased` in `CHANGELOG.md`. Freeze the candidate and record its commit with these command results:

   ```sh
   pnpm install --frozen-lockfile
   pnpm studio sync --check
   pnpm format:check
   pnpm check
   pnpm contract --released
   pnpm ownership --strict
   node src/platform/node/check/check-starter.js
   pnpm test:release
   node src/platform/node/check/upgrade-test.js
   pnpm build
   pnpm build:inspect
   ```

   After a supported public tag exists, also run the update rehearsal with `--from <preceding-public-tag>`. The release command’s shorter checks do not replace this acceptance. Verify the exact tag before pushing; when the release changes only version metadata and the changelog, rerun its contract, check and build gates. Any behavior change returns to full candidate acceptance.
2. On a clean `main` that matches `origin/main`, preview the release:

   ```sh
   pnpm release 0.1.0 --dry-run
   ```

   The dry run prints the version change, the changelog heading, the checks, the commit and tag it would make, and the release notes, and changes nothing. It lists every reason the release can't go ahead.
3. Cut it:

   ```sh
   pnpm release 0.1.0
   ```

4. Review the commit and the tag, then push both together with the command the script prints:

   ```sh
   git push --atomic origin main v0.1.0
   ```

The release commit goes to `main` directly, so the person pushing needs the right to push to `main`.

## What the script does

`pnpm release <version>` (`src/platform/node/cli/release.js`, logic in `src/platform/node/lib/release.js`):

- Requires a valid semver version that is greater than or equal to the current `PLATFORM_VERSION`. Equal is allowed, so the prepared first public beta can be released as `0.1.0` without another bump. A leading `v` is accepted.
- Refuses unless the checkout is on `main` with no uncommitted or untracked changes and matches `origin/main` after a fetch, the `## Unreleased` section exists and has notes, and neither the checkout nor `origin` has the tag yet.
- Checks the starter distribution before planning and again before applying: local contributor/prototype files, including ignored files, cannot enter the release build. Tracked profiles must be fictional samples with empty email and GitHub declarations; starter configuration must use personal mode without Admin or system maintainer grants.
- Sets `PLATFORM_VERSION` and runs `pnpm contract --update`, so the contract snapshot records the version.
- Renames `## Unreleased` to `## <version> (<YYYY-MM-DD>)`, using the local date, and starts a new empty `## Unreleased` section above it.
- Runs `pnpm check`, `pnpm contract --released`, and `pnpm build`. If any step fails, or a step changes a file other than the three the release edits, it restores those files and stops with nothing committed.
- Commits `Release v<version>` and creates the annotated tag `v<version>`, whose message is the release notes.
- Never pushes. It prints the push command.

## After pushing

Install from the exact public tag using the [installation guide](installing.md), with a frozen dependency installation. Verify the local preview and preserved permanent links. Check the public demo anonymously, including a direct prototype URL and reload. Include the candidate commit, tag, CI results, and verification results in the maintainer's release review before announcement.

The public launch tag establishes the first compatibility baseline. Before that tag, full/manual CI rehearses upgrades between synthetic revisions of the candidate foundation ([Checks and fixes](checks.md)). Historical pre-release tags do not require compatibility. Full/manual CI also exercises source from the latest supported public release when one exists; subsequent release acceptance uses the preceding supported tag explicitly. Upgrade success is part of the required `build` gate for explicit full checks in the upstream repository. Ordinary PRs use focused updater and preservation regressions; exhaustive update rehearsals and module configuration builds remain required for release acceptance. Manually dispatch **Checks and deployment** with **full_checks** to run them without creating a release or publishing.

If a release is wrong after it is pushed, cut a new patch release rather than moving or deleting the tag: studios may already have updated to it.

## Project repository publishing

The starter uses Parker Moss, a fictional sample contributor with a bundled illustrated avatar. Maintainer profiles and personal prototypes stay local through checkout-specific Git exclusions. Upstream CI and the release command check that distributed source contains only sample profiles and no personal grants or local contributor work. Build releases from a clean clone; see [Maintainer workspace and distributed source](releasing.md#maintainer-workspace-and-distributed-source).

The ongoing [public demo](https://itspatmorgan.com/design-studio-demo/) is included in the GitHub Pages deployment of `itspatmorgan/itspatmorgan.github.io`. The website's `/design-studio/` product page and `/design-studio-demo/` interactive demo are separate paths. This source repository does not deploy its own Pages site.

An isolated ChatGPT Sites fixture validates the optional publishing workflow with approved learning examples. Native Sites updates reuse that fixture's project identity in `.openai/hosting.json` and its URL. Use native Sites tools with static output `dist`, SPA fallback, and the root base path. Retain release ancestry and use the pinned mise environment. Deploy the saved source commit and matching build archive, and verify a successful native deployment result and the actual viewer. Set public access only when authorized; preserve the audience on updates.

The fixture's SPA fallback returns HTML with HTTP 200 for missing assets. Verify referenced assets, browser errors, and direct-link reloads after publication. This provider behavior does not replace the portable [hosting requirements](publishing.md#serve-updates-reliably).

For any host, install with Node 24 and pnpm 12, run `pnpm build`, and publish `dist/`. Use `pnpm test` for focused regressions or `pnpm build:release` for full release verification. `pnpm build:inspect` reports startup asset size and requests. Your chosen host owns routing, caching, access, and deployment configuration.

The [Checks workflow](../../../.github/workflows/checks.yml) preserves the required `scope` and `build` checks. Upstream-only checks identify this repository by its permanent GitHub repository ID, `1401250166`, so a repository rename does not disable them. Copies run checks without triggering the public website.

After a successful upstream push to `main`, [Publish demo](../../../.github/workflows/demo.yml) triggers the website's `deploy.yml` workflow. Set the `WEBSITE_DEPLOY_TOKEN` Actions secret here to a fine-grained GitHub token with **Actions: Read and write** access to **only** `itspatmorgan/itspatmorgan.github.io`. A missing token fails the publishing notification with a setup message; it does not bypass Studio checks. Pull requests and forks cannot trigger publication.

The website resolves the source repository by permanent ID and checks out the latest successful `main` push from `checks.yml` at its exact commit. It builds Studio with its declared mise toolchain and `STUDIO_BASE_PATH=/design-studio-demo/`, copies the output into the website's `dist/design-studio-demo/`, and uploads the combined Pages artifact. Set `STUDIO_PUBLIC_URL=https://itspatmorgan.com/design-studio-demo/` in that build to emit absolute social image URLs. Studio code remains in this repository. Failed Studio checks leave the prior passing version available for website builds.

The website's root `404.html` loads the demo's entry document only for demo application routes, preserving direct links and reloads. It also redirects the former `/design-studio-starter/` path while preserving the route, query, and fragment. These are browser redirects and Pages fallback responses retain HTTP 404 status. Disable this repository's old Pages site when switching to the combined deployment; otherwise it can claim `/design-studio/` after the rename.

To preview the demo's subpath locally:

```sh
STUDIO_PUBLIC_URL=https://itspatmorgan.com/design-studio-demo/ STUDIO_BASE_PATH=/design-studio-demo/ pnpm build
STUDIO_BASE_PATH=/design-studio-demo/ pnpm preview
```

See [Publishing](publishing.md) for portable hosting, direct-link routing, and access requirements.

## Related contracts

- [Ownership and updates](ownership.md) defines how a studio takes a release.
- [Checks and fixes](checks.md) defines the contract check and the upgrade test.
- [Format versions](formats.md) defines when a format change needs a version bump.
