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

A seed file stays the team's even when upstream changes how it is kept. If upstream deletes or replaces one (before the first release, the settings moved from a TypeScript file to `studio.config.json`), the update keeps the team's copy of the old file, brings the replacement as a new file, and leaves a person to move the team's values across and delete the old file. Release notes name such a step.

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
| `studio.config.json` | Seed | The team's settings after creation. Its schema, `src/platform/core/studio.config.schema.json`, is upstream. |
| `README.md` | Seed | The starter's README; rewrite it for the team. |
| `patches/`, `public/` | Upstream | Dependency patches and shared static files. |
| `package.json`, `pnpm-workspace.yaml`, `biome.json`, `vite.config.ts`, `tsconfig*.json`, `mise.toml`, `.github/`, `.husky/` | Upstream | Root tooling and workflows. |
| `.studio/ownership.json`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `CLAUDE.md`, `.gitignore`, `.git-blame-ignore-revs` | Upstream | The ownership map, project documents, and blame settings. |
| `pnpm-lock.yaml` | Generated | `pnpm install` |
| `AGENTS.md` | Generated | `pnpm studio sync`, from `src/platform/AGENTS.md`, the enabled modules' routing, and `AGENTS.team.md`. |
| `AGENTS.team.md` | Seed | The team's own guidance for coding agents. `src/platform/AGENTS.md` is upstream. |
| `.agents/skills/`, `.claude/skills/` | Generated | `pnpm studio sync`, recorded in `.agents/studio-skills.json`. Team-authored adapter entries are kept. |

`.studio/ownership.json` is the machine-readable form of this path map. `pnpm ownership` (also run by `pnpm check`) lists tracked paths the map does not cover and paths two tiers claim, and names the mixed files. In a studio, any path the map does not name is yours: it is treated as team-owned, so you can add top-level files without editing the map. Two rules of different tiers claiming one path is an error, since only upstream edits the map. The upstream project's CI also runs `pnpm ownership --strict`, which fails on an unnamed path so the map stays complete. Updates read the same map to resolve conflicts: generated files take the new revision, seed and team files keep the studio's copy, and other conflicts are left for review. The most specific rule wins, so a seed rule such as `src/systems/product/**` can sit beside the team rule `src/systems/**`.

## System roots

Design systems are found in two roots, listed once (supplied first) in `src/platform/core/roots.ts`. `src/platform/systems/` is supplied and upstream-owned; it holds only Studio's own interface system. `src/systems/` is the team's. A system's ID is its folder name, an ID can exist in only one root, and the platform system lives only in the supplied root, so a team system never shares a folder with upstream files.

## Module roots

Modules are found in two roots, listed once (supplied first) in `src/platform/core/roots.ts`. `src/platform/modules/` is supplied and upstream-owned; it holds the modules the starter ships, required or optional. `src/modules/` is the team's and starts with only a README. A module's ID is its folder name and an ID can exist in only one root, so a team module never reuses a supplied module's ID. Creating and adding modules writes only to the team root. Supplied modules are upstream code released with the platform, so they may import its internals. Team modules and systems import platform code only through the public API, `#studio/*` (`src/platform/api/`), so an update that reorganizes platform internals does not break them; see [Modules and extensions](modules.md#public-api).

## Agent instructions

`AGENTS.md` is generated, so an update never conflicts on it. `pnpm studio sync` writes it from three sources: the upstream guidance in `src/platform/AGENTS.md`, the routing lines for the enabled modules, and the team's own `AGENTS.team.md`, appended last. Never edit `AGENTS.md`; the next sync overwrites it. Put your team's conventions and product context for agents in `AGENTS.team.md` (or, for one system, in that system's `AGENTS.md`). `pnpm studio sync --check` fails when `AGENTS.md` is stale.

## Mixed paths

Some paths hold more than one tier. Change only your part of each:

- `package.json`: a team module's dependencies are added to the root manifest. Systems keep their dependencies in their own `package.json`.

## Related contracts

- [Modules and extensions](modules.md) defines supplied and team modules, `studio.lock.json`, and module boundaries.
- [Studio configuration](config.md) defines `studio.config.json`.
- [Contributor scope](contributor-scope.md) defines what a contributor may change inside a studio.
- [Agent context routing](agent-context.md) defines generated skill adapters.
