---
title: "Modules and extensions"
---

A module is a folder in `src/modules/<id>/` with a `module.ts` declaration. The platform discovers declarations without a separate registry.

Modules are copied into the repository. They are not downloaded or loaded as plugins at runtime.

## Ownership and dependencies

Keep a feature's implementation inside its module. Optional modules must support disabling and removal in their supported configurations. Contributors & Permissions is optional for personal use and required for team use. Configuration validation rejects team use without it.

Prototypes, Views, Text files, and Systems are required. Platform code and modules may depend on required modules.

A module cannot import another optional module's implementation. Outside code can read an optional module's declaration or its enabled public library entry.

Prototypes access public libraries through `@module/<id>`. They cannot import private platform paths. Runtime library code has its own dependency checks.

`src/platform/core/modules/index.ts` defines declarations and compatibility. `src/platform/core/api.ts` identifies shared extension types.

`requires` declares the minimum platform version. An incompatible module is disabled and reported by checks. The contract is currently 0.x and may change.

## Supported extension API

Start with `src/platform/core/api.ts` for module declaration types, application extension types, and studio identity.
File types use `src/platform/core/fileTypes.ts`, which can also load in Node.

Artifact modules can implement the [shared revision and lifecycle contract](source.md#artifact-revision-and-preview-lifecycle) through `core/artifact-lifecycle/index.ts`, with evidence appropriate to their renderer.

The explicit framework entrypoint inventory is `src/platform/core/modules/boundaries.ts`.
It covers existing shared navigation, artifact, documentation, source, and data services.
Module code can import those entries, but not other platform implementation files.
Changing the inventory, or other public contract listed in the [checks](checks.md), requires a `PLATFORM_VERSION` bump and `pnpm contract --update`.
Both `pnpm check` and the development/build import guard enforce this boundary.
Use literal import paths in browser module code and public libraries so checks can resolve dependencies, including type-only imports.
Node discovery tooling may load declared files by their discovered paths.
Public module libraries remain subject to the stricter prototype runtime boundary.

`ModuleApp.rail: 'none'` lets a module contribute to Home without adding a navigation destination. It can omit routes and a section when it owns no browsable content.

`ModuleApp.navLabel` supplies a shorter navigation label while the declaration retains the full capability name.

`ModuleApp.localOnly: true` restricts a module’s app contributions (rail, routes, home, and search) to local development. Published viewing sites omit them; the module’s source and configuration remain available.

These source contracts are 0.x. Review release guidance when updating them.
If a capability needs another integration, add a deliberate public contract rather than importing a private file.

## Capability files

| Path | Purpose |
| --- | --- |
| `module.ts` | Identity, compatibility, optional status, section, dependencies, library, and agent instruction declarations. |
| `app.tsx` | Navigation, routes, overview blocks, palette entries, and prototype actions. |
| `type.ts`, `open.tsx`, `loader.ts` | File-type declaration, rendering, and production loading. |
| `server.ts` | Local routes at `POST /__studio/<module>/<route>`. |
| `check.ts` | Module validation while enabled. |
| `lib/index.ts(x)` | Public entry exposed when `lib: true`. |
| `context/`, `skills/` | Module-owned knowledge and procedures. |
| `instructions/` in a pack | Optional packaging prefix for declared context and skills, installed into this module. |

Every module declares `optional` and `lib` as booleans. Omission cannot silently determine removability or expose a public library.

A section can declare a content folder, prototype-shaped items, contributor grouping, editing policy, and standalone published views.

The core page key `settings` is reserved. Modules and contributors cannot use it as a section or contributor key.

Use the TypeScript declaration for exact fields. See the [file-type contract](file-types.md) for artifact capability declarations, browser implementations, availability, and module-owned file actions.

Design systems are content in `src/systems/` (and Studio's own interface system in `src/platform/systems/`), not platform modules. Their [contract](../../modules/systems/README.md) defines system structure.

## Configuration and commands

`studio.config.ts` holds identity, personal or team use, enabled modules, and the default system. Each installed module has an explicit true/false entry, and each installed system appears in `systems`. Omitted declarations fail validation. Other customization happens in code.

```sh
pnpm studio list
pnpm studio disable <id>
pnpm studio enable <id>
pnpm studio add <source>
pnpm studio remove <module-or-system>
pnpm studio create-module <id>
pnpm studio create-system <id>
pnpm studio sync
pnpm check
```

Add, remove, and create commands preview changes. Applying them requires `--yes`. Use CLI help for source formats and optional flags.

Studio commands register and unregister capabilities, manage config module flags, `studio.lock.json`, and module-owned routing in `AGENTS.md`. The [manage-modules skill](../skills/manage-modules/SKILL.md) governs agent execution.

Disabling retains files. Removal deletes the module, including its context and skills, and refreshes project exposure. External content remains unless removal includes `--content`.

Packages remain installed after removal. Remove them only when no retained code uses them.

## Installation contract

Preview reads declarations as data. Applying installation trusts the module's code. It can execute the installed declaration and checks.

Packages install with lifecycle scripts disabled. Failed checks restore project files, but downloaded packages may remain in `node_modules`.

Sources can be local folders, HTTPS or SSH Git addresses, or HTTPS tarballs. HTTP, `file://`, and `git://` sources are rejected.

Packs cannot contain symlinks, escaping paths, or file collisions. Limits are 500 files, 2 MB per file, and 20 MB total.

Upstream libraries require their license and provenance. The license override is an explicit user decision, governed by the manage-modules skill.

Installation is not a sandbox. Installed code has the privileges of repository code.

## Discovery and verification

Node tooling discovers modules through `src/platform/node/lib/modules.js`. Browser discovery uses `src/platform/app/data/modules.ts`.

The manifest scans declared content sections. Vite supplies file globs and themes. The shell combines module navigation and routes.

`pnpm check` validates declarations, configuration, section collisions, dependency boundaries, file-type contracts, and enabled module checks.

`pnpm baseline removal <id>` checks physical removal. Optional-module verification should also cover disabling and retained content.

A module owns one canonical technical contract in its README.md. Human workflows live in `src/modules/documentation/pages/`, where a chapter declares `module: <id>` to follow that capability’s availability. Context includes standing requirements. Skills describe tasks. Link to contracts instead of copying them.

## Customization and updates

Supplied and locally authored modules use the same contract. Installed external capabilities record their source and file hashes in `studio.lock.json`; locally authored modules remain team-owned. The lock does not track supplied starter code or perform upgrades.

You own all repository code. Editing supplied modules or platform internals can create conflicts when merging upstream releases; [Ownership and updates](ownership.md) maps which paths are upstream, generated, seed, or team-owned. Review updates on a branch, reconcile local changes, and run `pnpm build`. The [customization Manual](/documentation/manual/customize) explains the progression from prototype work to platform changes.
