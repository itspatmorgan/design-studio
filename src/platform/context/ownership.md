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

Prefer team and seed paths for studio-specific work. If an upstream path must change, keep the edit small and record why, so the next update conflict is easy to resolve. A change that would help other studios belongs in the upstream project.

## Path map

| Path | Tier | Notes |
| --- | --- | --- |
| `src/platform/` | Upstream | Shell, core APIs, platform context and skills. |
| `src/modules/<id>/` for supplied modules | Upstream | Every module the starter ships, required or optional. |
| `src/modules/<id>/` for the team's modules | Team | Created through [Manage modules](../skills/manage-modules/SKILL.md). |
| `src/systems/studio/` | Upstream | Studio's own interface system. |
| `src/systems/<id>/` for other systems | Team | Includes their `package.json` and dependencies. |
| `src/systems/product/`, `src/systems/marketing/` | Seed | Example systems; adapt or replace them. |
| `src/prototypes/<contributor>/` | Team | The sample prototypes are seed. |
| `contributors/` | Team | The sample contributor is seed. |
| `studio.config.ts` | Seed | The team's settings after creation. |
| `README.md` | Seed | The starter's README; rewrite it for the team. |
| `scripts/`, `plugins/`, `patches/`, `public/` | Upstream | Tooling, setup, dependency patches, and shared static files. |
| `package.json`, `pnpm-workspace.yaml`, `biome.json`, `vite.config.ts`, `tsconfig*.json`, `mise.toml`, `.github/`, `.husky/` | Upstream | Root tooling and workflows. |
| `.studio/ownership.json`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SETUP.md`, `LICENSE`, `CLAUDE.md`, `.gitignore`, plugin manifests | Upstream | The ownership map, project documents, and plugin manifests. |
| `pnpm-lock.yaml` | Generated | `pnpm install` |
| `AGENTS.md` module routing block | Generated | `pnpm studio sync` |
| `.agents/skills/`, `.claude/skills/` | Generated | `pnpm studio sync`, recorded in `.agents/studio-skills.json`. Team-authored adapter entries are kept. |

`.studio/ownership.json` is the machine-readable form of this path map. `pnpm ownership` (also run by `pnpm check`) lists tracked paths the map does not cover and paths two tiers claim, and names the mixed files. It only warns for now. Updates read the same map to resolve conflicts: generated files take the new revision, seed and team files keep the studio's copy, and other conflicts are left for review. The most specific rule wins, so a team rule such as `src/modules/**` can sit beside the supplied module IDs.

## Mixed paths

Some paths hold more than one tier. Change only your part of each:

- `AGENTS.md`: the module routing block is generated. Other lines are upstream guidance; add team guidance in your systems' context instead.
- `src/modules/`: supplied and team modules share this folder. A team module must not reuse a supplied module's ID.
- `src/systems/`: Studio's own system shares the folder with team systems.
- `package.json`: a team module's dependencies are added to the root manifest. Systems keep their dependencies in their own `package.json`.

## Related contracts

- [Modules and extensions](modules.md) defines supplied and team modules, `studio.lock.json`, and module boundaries.
- [Studio configuration](config.md) defines `studio.config.ts`.
- [Contributor scope](contributor-scope.md) defines what a contributor may change inside a studio.
- [Agent context routing](agent-context.md) defines generated skill adapters.
