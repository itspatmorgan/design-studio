---
title: "Modules and extensions"
---

A module is a folder with a `module.ts` declaration. The platform discovers declarations without a separate registry.

Modules are found in two roots, listed once (supplied first) in `src/platform/core/roots.ts`: `src/platform/modules/<id>/` holds the modules the starter ships, and `<module folder>/` holds the team's own. A module's ID is its folder name in either root, so an ID can exist in only one: a team module must not reuse a supplied module's ID, and `pnpm check` and the build reject it. Creating a module (`pnpm studio create-module`) and adding one from a source write only to `src/modules/`. Enable, disable, removal, and the rules between modules work the same in either root. Supplied modules ship in the same release as the platform, so they may import platform internals; team modules use the [public API](#public-api).

Modules are copied into the repository. They are not downloaded or loaded as plugins at runtime.

## Ownership and dependencies

Keep a feature's implementation inside its module. Optional modules must support disabling and removal in their supported configurations. Contributors & Permissions is optional for personal use and required for team use. Configuration validation rejects team use without it.

Prototypes, Views, Text files, and Systems are required. Platform code and modules may depend on required modules.

A module cannot import another optional module's implementation. Outside code can read an optional module's declaration or its enabled public library entry.

Prototypes access public libraries through `@module/<id>`. They cannot import private platform paths. Runtime library code has its own dependency checks.

Every module declares `requires`, the oldest platform version it works with, such as `requires: '0.2.0'`. A module without one fails validation. An incompatible module is disabled and reported by checks.

## Public API

Team modules (`src/modules/<id>/`) and team systems (`src/systems/<id>/`) import platform code only through the public API in `src/platform/api/`, one file per entry. The root `package.json` maps `#studio/*` to those files through its `imports` field, so one specifier works in browser code, Node-loaded files such as `type.ts`, `server.ts`, and `check.ts`, and a system's `system.ts`.

| Entry | Use it for | Where it loads |
| --- | --- | --- |
| `#studio/module` | `ModuleSpec`, `ModuleApp`, `ModuleServer`, `ServerRoute`, `ModuleCheck`, `ModuleBuild` (experimental), `PaletteContext`, `PrototypeAction`, `PLATFORM_VERSION`, and the studio identity: `APP_NAME`, `TAGLINE`, read-only `CONFIG`. | Types anywhere; the identity values in app code. |
| `#studio/system` | `SystemSpec`, `SystemLibrary`, `SystemIntro`, and the types inside them. | Types anywhere. |
| `#studio/files` | Declaring a file type in `type.ts`: `defineFileType`, `FileTypeSpec`, capabilities, identity, and the Markdown declaration to extend. | Browser and Node. |
| `#studio/data` | Reading content in the app: the manifest, a prototype's files, the current contributor and edit permissions, `callModule`, and what a file type's `loader.ts` and `open.tsx` implement. | Browser. |
| `#studio/ui` | The shell's building blocks: section navigation, home blocks, collections, documents, and the source editor. | Browser. |
| `#studio/components` | Studio's interface components, such as `Button`, `Dialog`, `Input`, `Tooltip`, menus, and `toast`. | Browser. |

`src/platform/api/*.ts` lists each export with a JSDoc tag:

- `@stable`: the declaration types, `PLATFORM_VERSION`, and the identity values. A stable export, and a stable declaration type's fields, change only with a new `PLATFORM_VERSION`.
- `@experimental`: everything else. It may change in any 0.x release; release notes name the change.

Importing anything under `src/platform/` from team code by another path, including `src/platform/node/` and Studio's system files, is an error in `pnpm check` and in the development and build import guard. Imports between modules use `@module/<id>` as before. Supplied modules may import platform internals, since they ship with the platform; their imports are not examples of the public API.

The [contract snapshot](checks.md#platform-contract) records every API export with its stability. `pnpm contract` fails when an export has no tag, when a stable export changes without a `PLATFORM_VERSION` bump, or when an experimental export changes without `pnpm contract --update`.

Use literal import paths in module code and public libraries so checks can resolve dependencies, including type-only imports. Node discovery tooling may load declared files by their discovered paths. Public module libraries remain subject to the stricter prototype runtime boundary.

If a capability needs a platform service the API does not offer, propose an addition to the public API rather than importing a private file.

`ModuleApp.rail: 'none'` lets a module contribute to Home without adding a navigation destination. It can omit routes and a section when it owns no browsable content.

`ModuleApp.navLabel` supplies a shorter navigation label while the declaration retains the full capability name.

`ModuleApp.localOnly: true` restricts a module’s app contributions (rail, routes, home, and search) to local development. Published viewing sites omit them; the module’s source and configuration remain available.

These source contracts are 0.x. Review release guidance when updating them.

## Capability files

| Path | Purpose |
| --- | --- |
| `module.ts` | Identity, compatibility, optional status, section, dependencies, library, and agent instruction declarations. |
| `app.tsx` | Navigation, routes, overview blocks, palette entries, and prototype actions. |
| `type.ts`, `open.tsx`, `loader.ts` | File-type declaration, rendering, and production loading. |
| `server.ts` | Local routes at `POST /__studio/<module>/<route>`. |
| `check.ts` | Module validation while enabled. |
| `build.ts` | Optional manifest contribution while enabled: `manifest({ root, enabled, out })` returns `{ data, errors }`, stored as `manifest.contributions[<id>]` (its printed problems count as manifest errors); `watch` lists folders whose Markdown changes rebuild the manifest in development; `sourceFiles(data, { root })` lists repo-relative files the Documentation surface may edit. Experimental. |
| `lib/index.ts(x)` | Public entry exposed when `lib: true`. |
| `context/`, `skills/` | Module-owned knowledge and procedures. |
| `instructions/` in a pack | Optional packaging prefix for declared context and skills, installed into this module. |

Every module declares `optional` and `lib` as booleans. Omission cannot silently determine removability or expose a public library.

A section can declare a content folder, prototype-shaped items, contributor grouping, editing policy, and standalone published views.

The core page key `settings` is reserved. Modules and contributors cannot use it as a section or contributor key.

Use the TypeScript declaration for exact fields. See the [file-type contract](file-types.md) for artifact capability declarations, browser implementations, availability, and module-owned file actions.

Design systems are content in `src/systems/` (and Studio's own interface system in `src/platform/systems/`), not platform modules. Their [contract](../modules/systems/README.md) defines system structure.

## Configuration and commands

`studio.config.json` holds identity, personal or team use, enabled modules, and the default system. Each installed module has an explicit true/false entry, and each of the team's installed systems appears in `systems`; Studio's own system is always available and is never listed. Omitted declarations fail validation. Other customization happens in code.

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

Studio commands register and unregister capabilities, manage config module flags, `studio.lock.json`, and module-owned routing in the generated `AGENTS.md`. The [manage-modules skill](../skills/manage-modules/SKILL.md) governs agent execution.

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

Node tooling discovers modules in both roots through `src/platform/node/lib/modules.js` (folder helpers in `src/platform/node/lib/module-folders.js`). Browser discovery uses `src/platform/app/data/modules.ts`, whose glob patterns spell both roots. Each registers where a module's folder is (`moduleFolder` in `src/platform/core/roots.ts`), so context, skills, routing links, and build globs find a module in the root that holds it.

The manifest scans declared content sections. Vite supplies file globs and themes. The shell combines module navigation and routes.

`pnpm check` validates declarations, configuration, section collisions, dependency boundaries, file-type contracts, and enabled module checks.

`pnpm baseline removal <id>` checks physical removal. Optional-module verification should also cover disabling and retained content.

A module owns one canonical technical contract in its README.md. Human workflows live in `src/platform/modules/documentation/pages/`, where a chapter declares `module: <id>` to follow that capability’s availability. Context includes standing requirements. Skills describe tasks. Link to contracts instead of copying them.

## Customization and updates

Supplied and locally authored modules use the same contract, in different roots. Installed external capabilities record their source and file hashes in `studio.lock.json`; locally authored modules remain team-owned. The lock's `platform` entry records the upstream release the studio is on ([The installed release](ownership.md#the-installed-release)); the lock does not track supplied starter code file by file.

You own all repository code. Editing supplied modules or platform internals can create conflicts when merging upstream releases; [Ownership and updates](ownership.md) maps which paths are upstream, generated, seed, or team-owned. Review updates on a branch, reconcile local changes, and run `pnpm build`. The [customization Manual](/documentation/manual/customize) explains the progression from prototype work to platform changes.
