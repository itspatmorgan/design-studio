---
title: Ownership and updates
description: Which repository paths the upstream project maintains, which the team owns, and how each kind changes during an update.
toc: true
---

A studio is a copy of the Design Studio repository. Every path in it has one owner tier. The tier says who changes the path and what happens to it when the studio takes a newer upstream release. You own all of the code and may change any of it; the tiers say which changes keep updates simple.

## Tiers

| Tier | Who changes it | During an update |
| --- | --- | --- |
| Upstream | The Design Studio project | Upstream changes merge in. A local edit can conflict and needs review. |
| Generated | A command | Regenerated from its sources. Never merged or edited by hand. |
| Seed | Upstream ships it once; then the team | The team's copy stays. Later upstream changes do not overwrite it. |
| Team | The team | Untouched. |

A seed file belongs to the studio once installed, including an unchanged copy. If upstream deletes or replaces it, the update keeps the studio's old file and brings a genuinely new seed path from the release. A person reviews the replacement and removes the old file when ready. A studio's own deletion stays deleted; an update does not restore it.

Ownership applies to the entire merge result, including files Git merges without conflict. The studio's pre-update map protects existing seed and team paths during that update, even if the release changes their tier. Incoming rules govern new paths and other upstream changes. New seed paths use the release's complete copy, without transplanting edits from a renamed old seed. New team-owned paths are not imported from upstream. An unlisted studio path is team-owned. Generated paths take the release's copy or deletion before regeneration. Skill adapters and their receipt instead retain the studio's input for synchronization, which replaces managed entries while preserving team-authored or modified entries. Upstream and mixed paths use Git's merge; their conflicts remain for review.

Prefer team and seed paths for studio-specific work. If an upstream path must change, keep the edit small and record why, so the next update conflict is easy to resolve. A change that would help other studios belongs in the upstream project.

## Path map

| Path | Tier | Notes |
| --- | --- | --- |
| `src/platform/` | Upstream | Shell, core APIs, Node tooling, platform context and skills. |
| `src/platform/api/` | Upstream | The public API team modules and systems import as `#studio/*`. |
| `src/platform/systems/studio/` | Upstream | Studio's own interface system, in the supplied system root. |
| `src/platform/modules/<id>/` | Upstream | Every module the starter ships, required or optional, in the supplied module root. |
| `<module folder>/` | Team | The team's own modules, in the team module root. Created through [Manage modules](../skills/manage-modules/SKILL.md). |
| `src/systems/<id>/` | Team | The team's systems, in the team system root. Includes their `package.json` and dependencies. |
| `src/systems/product/`, `src/systems/marketing/` | Seed | Example systems; adapt or replace them. |
| `src/prototypes/<contributor>/` | Team | The sample prototypes are seed. |
| `contributors/` | Team | The sample contributor is seed. |
| `studio.lock.json` | Team | What the studio installed: its upstream platform release (`platform`) and the modules and systems added with `pnpm studio add`. Studio commands write it; the starter does not ship it. See [The installed release](#the-installed-release). |
| `studio.config.json` | Seed | The team's settings after creation. Its schema, `src/platform/core/studio.config.schema.json`, is upstream. |
| `README.md` | Seed | The starter's README; rewrite it for the team. |
| `patches/`, `public/` | Upstream | Dependency patches and shared static files. |
| `package.json`, `pnpm-workspace.yaml`, `biome.json`, `vite.config.ts`, `tsconfig*.json`, `mise.toml`, `.github/`, `.husky/` | Upstream | Root tooling and workflows. |
| `.studio/ownership.json`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `CLAUDE.md`, `.gitignore`, `.git-blame-ignore-revs` | Upstream | The ownership map, project documents, and blame settings. |
| `pnpm-lock.yaml` | Generated | `pnpm install` |
| `AGENTS.md` | Generated | `pnpm studio sync`, from `src/platform/AGENTS.md`, the enabled modules' routing, and `AGENTS.team.md`. |
| `AGENTS.team.md` | Seed | The team's own guidance for coding agents. `src/platform/AGENTS.md` is upstream. |
| `.agents/skills/`, `.claude/skills/` | Generated | `pnpm studio sync`, recorded in `.agents/studio-skills.json`. Team-authored adapter entries are kept. |

`.studio/ownership.json` is the machine-readable form of this path map. `pnpm ownership` (also run by `pnpm check`) lists tracked paths the map does not cover and paths two tiers claim, and names the mixed files. In a studio, any path the map does not name is yours: it is treated as team-owned, so you can add top-level files without editing the map. Two rules of different tiers claiming one path is an error, since only upstream edits the map. The upstream project's CI also runs `pnpm ownership --strict`, which fails on an unnamed path so the map stays complete. Updates (see [Updating a studio](#updating-a-studio)) use the studio and incoming maps to apply the preservation rules above across the entire tree. The most specific rule wins, so a seed rule such as `src/systems/product/**` can sit beside the team rule `src/systems/**`.

## Updating a studio

Upstream releases are tags named `v<version>` on the Design Studio project ([Releasing](releasing.md)). A studio takes one with `pnpm studio update` (`src/platform/node/cli/studio-update.js`, logic in `src/platform/node/lib/studio-update.js`):

| Command | What it does |
| --- | --- |
| `pnpm studio update --dry-run` | Shows the installed release, the target release, the commit range, and the files the release changes that the studio changed too, with each one's tier and what the update does to it. Changes nothing but the fetched tag refs. |
| `pnpm studio update [version]` | Updates to the latest release, or to `version` (`0.2.1` or `v0.2.1`). |
| `pnpm studio update --continue` | Finishes an update after a person resolves its conflicts. |

The update:

1. Requires a clean working tree, no merge in progress, and an `upstream` remote. Without the remote it prints the command to add one: `git remote add upstream https://github.com/itspatmorgan/design-studio-starter.git`.
2. Fetches the `v*` tags from `upstream` into `refs/studio/upstream-tags/`, so they never replace the team's own tags. Without a version it takes the newest release that is not a pre-release.
3. Stops with nothing to do if the studio already contains the release's commit, or `studio.lock.json` records it or a later one.
4. Creates and switches to `studio-update/v<version>` from the current HEAD, and merges the release with the update rules (`src/platform/node/lib/upstream-merge.js`): existing seed and team paths keep the studio's complete copy or deletion, genuinely new seed paths take the release, generated files take the release and are regenerated, and upstream or mixed files merge as text.
5. On a conflict, leaves the merge in progress and lists the files the release and the team both changed. The person resolves them, runs `git add`, and runs `pnpm studio update --continue`; or runs `git merge --abort`, switches back to their branch, and deletes the update branch.
6. On success, records the release in `studio.lock.json` within the merge commit, then runs `pnpm check` and `pnpm build` and reports the result. The next step is to review the branch and merge it into the team's branch.

It never pushes and never changes the branch it started from. It runs before the studio runtime loads, so a studio whose settings don't validate can still update.

The update's base is Git's merge base with the release. New studios clone a tagged release with the starter's history, keep the starter as `upstream`, and start a local `main` branch. The default [installation guide](installing.md) uses this release clone directly. The separate plugin installer also records the tag's version and commit in `studio.lock.json` and commits that record on top of the release.

Clone a release with its history for manual setup too. Updates need release ancestry; a ZIP download or shallow studio clone does not preserve the required history. Keep `upstream` for fetching releases. If you connect a private or company repository for your studio, use `origin` for that repository. Your team controls its access and when updates are reviewed and merged. Do not push studio work to the starter's `upstream`.

For an older studio without shared history, the release recorded in `studio.lock.json` is the fallback base. The update first records that release as an ancestor while keeping the studio's files. A studio with neither shared history nor a recorded release can't be updated by the command.

## The installed release

`studio.lock.json` records the upstream release a studio is on:

```json
{
  "lockfileVersion": 1,
  "platform": { "version": "0.2.1", "commit": "<full commit id of the v0.2.1 tag>" },
  "modules": {},
  "systems": {}
}
```

`pnpm studio update` writes the entry in the update's merge commit, and the installer writes it when it creates a studio. The upstream starter never ships a lock with a `platform` entry, since its own commit would be wrong for every copy. A studio without the entry, or with one the tools can't read, is on an unknown release: `pnpm studio list` says so, and an update falls back to Git's merge base between the studio and the release. Once written, the lock always exists; `pnpm studio add` and `remove` keep the entry.

The lock is team-owned. Upstream tools write it, but it describes the team's studio, and upstream does not ship it, so it is not a seed file and an update never merges an upstream copy over it. Don't edit it by hand.

## System roots

Design systems are found in two roots, listed once (supplied first) in `src/platform/core/roots.ts`. `src/platform/systems/` is supplied and upstream-owned; it holds only Studio's own interface system. `src/systems/` is the team's. A system's ID is its folder name, an ID can exist in only one root, and the platform system lives only in the supplied root, so a team system never shares a folder with upstream files.

## Module roots

Modules are found in two roots, listed once (supplied first) in `src/platform/core/roots.ts`. `src/platform/modules/` is supplied and upstream-owned; it holds the modules the starter ships, required or optional. `src/modules/` is the team's and starts with only a README. A module's ID is its folder name and an ID can exist in only one root, so a team module never reuses a supplied module's ID. Creating and adding modules writes only to the team root. Supplied modules are upstream code released with the platform, so they may import its internals. Team modules and systems import platform code only through the public API, `#studio/*` (`src/platform/api/`), so an update that reorganizes platform internals does not break them; see [Modules and extensions](modules.md#public-api).

## Agent instructions

`AGENTS.md` is generated, so an update never conflicts on it. `pnpm studio sync` writes it from three sources: the upstream guidance in `src/platform/AGENTS.md`, the routing lines for the enabled modules, and the team's own `AGENTS.team.md`, appended last. Never edit `AGENTS.md`; the next sync overwrites it. Put your team's conventions and product context for agents in `AGENTS.team.md` (or, for one system, in that system's `AGENTS.md`). `pnpm studio sync --check` fails when `AGENTS.md` is stale.

## Mixed paths

Some paths hold more than one tier. Change only your part of each:

- `package.json`: a team module's dependencies are added to the root manifest. Systems keep their dependencies in their own `package.json`.

An update merges root dependency additions with upstream tooling changes. If both sides change the same declaration, the conflict requires review before installation. A system's team-owned manifest retains its complete copy.

## Related contracts

- [Modules and extensions](modules.md) defines supplied and team modules, `studio.lock.json`, and module boundaries.
- [Studio configuration](config.md) defines `studio.config.json`.
- [Contributor scope](contributor-scope.md) defines what a contributor may change inside a studio.
- [Agent context routing](agent-context.md) defines generated skill adapters.
