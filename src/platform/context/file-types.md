---
title: "File types"
---

An artifact is a navigable piece of prototype work backed by a file, such as a view, document, diagram, or canvas. Folders organize artifacts; helpers, metadata, and other assets remain supporting files.

A file type is the module capability declared by `type.ts` that recognizes and renders those files. Enabled types determine how artifacts are discovered, created, opened, and embedded.

## Scopes

| Module | Scope |
| --- | --- |
| Views | Required prototype `.tsx` and `.jsx` views. |
| Diagrams | Optional prototype `.mermaid` and `.mmd` diagrams. |
| Documents | Optional prototype `.md` pages. |
| Systems | Required system context `.md` pages. |
| Canvases | Optional prototype `.excalidraw` scenes. |
| Text files | Required fallback for other system context text files. |

Extension ownership is unique within each scope. Documents and system context can both claim `.md` because their scopes differ.

Other prototype files remain plain files. Underscore helpers are excluded from normal artifact discovery.

## Files and fields

`src/platform/core/fileTypes.ts` defines `FileTypeSpec`, `defineFileType`, and artifact slug handling. A team module imports them from `#studio/files`, and the browser side of a file type (the manifest, file reading, `createLoader`, `FileTypeModule`) from `#studio/data` ([public API](modules.md#public-api)).

The `identity` adapter for prototype file types reads and writes permanent prototype-artifact metadata. Views, Documents, Diagrams, and Canvases provide it. System content keeps its existing path identification. Creation allocates IDs, saves preserve them, and public prototype routes use them. New directly authored files require `pnpm studio identify <prototype-folder> --yes`; builds never allocate them. See [Resource identity](resource-identity.md).

| File | Contract |
| --- | --- |
| `module.ts` | Standard module identity and optional status. |
| `type.ts` | Extensions, label, language, capabilities, implementations, validation, and scope flags. |
| `open.tsx` | Icon, loader, page, optional live `Embed`, and module-owned actions. |
| `loader.ts` | Production file globs and its own HMR acceptance. |

`type.ts` imports only the file type declarations, because Node loads it directly: `#studio/files` in a team module, `../../core/fileTypes.ts` in a supplied one.

`inPrototype`, `inSystemContent`, and `fallback` are required booleans. `inPrototype: true` permits prototype artifacts; `inSystemContent: true` permits system knowledge files. Omission fails validation. A `fallback` type opens other system context text files without claiming extensions.

## Artifact capabilities

Every file type declares a required `capabilities` object in `type.ts`. Node commands and browser readers consume the same declaration. It describes support, not current permission or preview readiness.

| Field | Meaning |
| --- | --- |
| `source` | Local source viewing and editing are supported. A supported `language` is required. |
| `create` | The type offers new-file creation. It must match the presence of a `template` function. |
| `fidelity` | Prototype fidelity switching is supported. It must match the `fidelity` implementation. |
| `embeds` | Allowed live-preview surfaces: `document`, `canvas`, both, or `[]`. |
| `actions` | Namespaced module-owned action IDs, or `[]`. Implementations live in `open.tsx`. |

Declare every field, including false and empty values. Unknown fields, duplicate surfaces, unsupported surfaces, and invalid action IDs fail validation. File types always supply a page and loader; there is no separate optional page capability.

The enabled browser registry validates that declared embed surfaces have an `Embed` and that declared actions match implementations. An undeclared implementation is an error, not permission to expose behavior.

`artifactAvailability(spec, context)` separates `supported` from `available`. Unavailable results include a reason. The caller explicitly supplies local/published mode, current edit authority, artifact presence, renderer availability, and content scope. Missing or disabled types have no active support.

Source viewing remains available without edit permission. It does not depend on a working page renderer, so broken code remains repairable. Source edits and fidelity changes require current edit authority and local execution. Creation does not require an existing artifact. Pages and embeds require an artifact and renderer in the declared content scope. Embed resolution checks that scope as well as the declared surface. The resolver describes UI availability; server write checks remain authoritative.

### Module-owned actions

A type can add an action without changing the shared file menu. Declare its ID in `capabilities.actions`, then provide the implementation in `open.tsx.actions`. IDs use `<file-type-id>.<action-name>`.

Each implementation supplies `id`, `label`, `run`, and explicit `localOnly` and `mutates` booleans. An optional `icon` uses the shared icon type. An optional `unavailable(context)` returns a reason or `null`; it must be a read-only availability check. Context contains the prototype, artifact, and availability environment.

The shared menu shows declared actions and explains unavailable ones. `runArtifactAction` requires a resolver that reads current declarations, artifact identity, and authority after the menu closes. A removed artifact, changed type, unmounted reader, or revoked permission cannot reuse a captured menu context. Studio applies its own refusals before calling module availability checks. Callback failures or invalid results keep the action unavailable with a diagnostic reason. Mutating actions require local execution and edit authority regardless of `localOnly`. Handlers must use authorized server operations for writes; these flags are not authentication. Read-only actions with `localOnly: false` can appear in published artifact menus. Existing types declare no additional actions.

For example, a file type can declare `actions: ['view.inspect']` and implement a nonmutating `view.inspect` action that opens its inspection surface. This is an extension example, not an implemented inspector. Keep dependencies within module boundaries. A separate optional inspection module would need its own deliberate integration contract; do not import its private implementation into another module.

### Updating existing file types

Replace `preview` in `type.ts` and `embedSurfaces` in `open.tsx` with `capabilities.embeds`. Copy the actual browser surfaces; do not translate `preview: false` to an empty array blindly. Canvas previously used false for canvas sizing while still providing document previews.

Add explicit `source`, `create`, `fidelity`, and `actions` declarations. Keep syntax, template, and fidelity functions as implementation details. Do not add capabilities to prototype files or a second artifact registry. Permanent identity and module enablement retain their existing contracts.

Future inspection, exports, and preview lifecycle can extend these boundaries. No inspector, new export format, lifecycle state machine, or agent runtime is implied by the declaration.

## Rendering and source

Supported editor languages are `tsx`, `markdown`, `json`, `mermaid`, and `text`. The template supplies new-file content. The check reports invalid content.

The app record is `Artifact`, and a loaded `Prototype` holds an `artifacts` collection. Manifest lookup and navigation use `findArtifact`, `firstArtifact`, `artifactLink`, and `artifactSlug`. Shared readers such as the system context reuse the same record and file-type machinery while keeping their own user-facing document terms.

An `Embed` in `open.tsx` supplies a read-only preview for documents and canvases. Core resolves references and uses this contract without importing individual modules. The required `capabilities.embeds` array in `type.ts` explicitly permits `document`, `canvas`, both, or neither (`[]`). Omission never enables a surface. Types without a preview on that surface appear as cards. Canvas restricts its preview to documents, keeping canvas nesting bounded.

A module can provide a lightweight `EmbedPending` in `open.tsx` for document loading. The shared reader uses it during reference resolution and lazy renderer loading. It passes the same `loadingStartedAt` timestamp to the pending surface and `Embed`, so delayed feedback can continue across the handoff. Modules without this surface retain generic loading feedback. The pending component must not import its heavy renderer.

Prototype documents use `![Description](./relative/file.ext)` on its own line. The shared Markdown reader resolves the exact file within the same prototype, renders the registered preview or card, and provides an Open link. Inline references stay links. Missing or disabled types show an unavailable message. Ordinary image formats retain Markdown image behavior.

Preview surfaces use the shared `EmbedFrame`: rounded corners and a full-width gray header link that darkens and reveals Open on hover or keyboard focus. Header text is never underlined. Preview contents are inert; interaction happens after opening the file.

A loader uses `import.meta.glob(['/__studio_globs__/*'])`. Vite replaces the placeholder with extensions and content roots, excluding archived prototypes in production.

## Page preparation

Route readers call `prepareFile` to prepare content and the registered `Page` together. Deferred page components expose `preload` through TanStack `lazyRouteComponent`. A raw React lazy component does not provide this preparation contract. The module loader returns page props and handles its file access. Rendered canvases and diagrams may then show their own loading status while initializing their scene or SVG. See [Navigation handoff](source.md#navigation-handoff).

## Lifecycle

Follow the [module contract](modules.md) for installation, disabling, removal, and dependency boundaries.

Disabling a prototype file type preserves its files as plain files. Normal navigation hides them unless Show all files is selected.

The first available artifact in navigation order opens by default. Disabling a file type removes its artifacts from that order.

Required types cannot be disabled or removed with studio commands. Required types may be imported by the platform and other modules.

Restart the dev server after capability changes. Ordinary content edits are reflected during development.

## Add a type

1. Create a module declaration with the appropriate optional status and system context routing.
2. Add `type.ts` and `open.tsx`. Use Documents as a small reference implementation.
3. Add `loader.ts` if published content needs bundled file loading.
4. Use the artifact registry to resolve other artifacts rather than importing optional file types.
5. Run module checks and a build. Verify disabling and removal for optional types.
