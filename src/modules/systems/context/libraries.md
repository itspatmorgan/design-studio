---
title: System libraries and dependencies
description: Own external packages within a system and expose selected APIs to its prototypes.
---

## Package ownership

Each prototype system is a private pnpm workspace with its own `package.json`. Declare direct runtime packages in `dependencies`, including component primitives and package fonts. Use an empty object when none are needed. Transitive packages are managed by pnpm; a system must declare a package before importing it directly.

The root owns platform and module dependencies. An installed root package does not grant access to a prototype system. Workspace resolution and Studio's import checks enforce this distinction. These are authoring boundaries, not a security sandbox for untrusted code.

System packages declare `private: true`, `type: 'module'`, and a unique `@studio-system/<identity>` name. Managed installation and creation allocate that name from the permanent system identity. Renaming preserves it.

React and React DOM are supplied by Studio. Declare both in `peerDependencies` using the root's version requirements; never install private copies. pnpm disables automatic peer installation. Studio checks React compatibility through each system's installed runtime dependency graph. Vite deduplicates these two packages. Other libraries can use different versions in different systems.

From the checkout, add a selected dependency to its owner:

```sh
pnpm --filter @studio-system/<identity> add <package>@<version> --ignore-scripts
```

Use the package name from that system's manifest. Commit its manifest and the shared `pnpm-lock.yaml` together. Run `pnpm install --frozen-lockfile --ignore-scripts` to verify restoration. Restart the development server after dependency changes.

System creation, installation, rename, and deletion synchronize workspace lock entries. Archive keeps packages locally while excluding system content from deployment. Removing one system does not remove another system's dependency declaration.

## Public libraries

Declare `libraries: []` in `system.ts` when no external APIs are exposed. Internal dependencies do not need a library declaration.

A public library declares `id`, `label`, `package`, `description`, `entry`, and an HTTPS `docs` link. `entry` identifies a system-owned runtime file under `libraries/`. Optional `components` lists documented component slugs using that library. The package must be a direct dependency. Installed versions come from package resolution; do not duplicate them in the declaration.

```ts
libraries: [{
  id: 'charts',
  label: 'Recharts',
  package: 'recharts',
  description: 'Charts and data visualization.',
  entry: 'libraries/charts.ts',
  docs: 'https://recharts.github.io/en-US/',
  components: ['chart'],
}],
```

An entry can re-export the upstream API without copying its implementation:

```ts
// libraries/charts.ts
export * from 'recharts';
```

Assigned prototypes import through this declared entry. Additional files under `libraries/` remain internal. Prefer themed system components when available; direct library APIs still need the system's tokens, providers, and popup conventions.

Prototype bare-package imports are limited to the shared runtime: React, React DOM, Lucide React, and TanStack React Router. Additional packages belong to an assigned system and are exposed through its libraries. A prototype with `systemId: null` has no system library access. Shared utilities cannot borrow system dependencies.

Package access checks cover static imports, re-exports, type imports, literal dynamic imports, and require calls before resolution. Importing a `node_modules` filesystem path cannot bypass ownership. Theme package imports follow the same ownership policy and existing scoped CSS validation.

## Review and discovery

The system's Libraries page presents public libraries, installed versions, documentation, component example links, and import entries. Internal helpers and transitive dependencies are omitted. Fonts and icons retain their Assets surfaces.

Verify component examples and a representative assigned prototype after adding a library. Confirm another system cannot import it. A working package API does not establish theme fidelity or provider compatibility.
