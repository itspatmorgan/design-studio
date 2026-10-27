# DialKit

An optional, prototype-focused module for bespoke design refinement. The registered ID remains `dialkit-lab` so existing imports and configuration retain their identity. It appears as **DialKit** under Prototyping in Studio settings. Normal module availability controls it.

## Ownership and surfaces

The module owns its floating panel, native DialKit controls, iframe protocol, source preparation, attachment inventory and actions. Platform code supplies generic preview-inspector and artifact-action extension points. Systems has no DialKit demo, hardcoded component adapter or package imports. Native folders, control rendering and version UI remain native.

The inspector is local-authoring UI. Published previews use source defaults and show no inspector. Views may have a system or explicitly use no system. Canvas/document embeds do not acquire an inspector. System component documentation, timeline UI and shared token editing are outside this integration.

## Attachment and tuning

Right-click a View and choose Add DialKit. One workspace belongs to one view; any number of named groups may register within it. The empty state directs the person to ask their agent in chat for desired controls. Presence comes from the source declaration/imports through the module's manifest contribution, including inactive views. Active runtime registration does not decide attachment.

Prototype code imports `useBespokeControls` and the `DialConfig` type from `@module/dialkit-lab`. Group names must be unique string literals for source saving. The hook returns values; an optional `onAction` callback handles native actions. Keep bindings local and do not infer schemas from the DOM or mutate a shared system automatically.

Hide/Show DialKit lives below file visibility in the prototype menu. The shortcut is ⌘⇧; on Mac or Ctrl+Shift+; elsewhere. Visibility is per artifact in this tab's memory and resets on reload. Collapsing or hiding preserves live values. The absolute overlay reserves no preview width. Native folders and version rows share one control scroll area.

## Save and remove

Save in the header captures fresh values from every registered group before preparing new source defaults. Slider ranges/steps, nested folders, actions, pad axes and control metadata remain intact. Ordinary source writes recheck permissions, permanent identity and source version. A changed, interrupted or unresponsive preview fails without overwriting source. Live values and native versions are transient until explicitly saved. Native versions are editable tuning branches, not source history.

Remove DialKit in the View menu captures current values, writes ordinary typed value objects, removes the module imports/workspace declaration and cleans configuration scaffolding made unused by the transform. Prototype markup, handlers outside the removed controls, identity and assignment remain. Potentially effectful initializers are preserved. Unsupported bindings, dynamic/duplicate group names and mismatched live groups produce an actionable error rather than a guessed rewrite. Open an inactive connected view before removing it so its live values can be captured. Empty workspace removal needs no running groups.

Add after removal creates an empty workspace around the preserved design. It does not reconstruct the deleted schema. Ask the agent to add new dials. The same pure source transform is available in `node/source.ts`; UI preparation calls the module's `transform` route, and the application performs the existing version-checked source write. The preparation route itself does not read or write files.

## Images and bridge

Uploaded images use the public, Node-only `#studio/assets` service, authorized for the current prototype and trusted server actor. It writes bounded, content-addressed files to the prototype's `assets/` directory. Retries reuse the same file. Save/Remove produce ordinary Vite imports that survive module removal and publishing. Images must fit Studio's 750 KB asset limit. Reset does not delete uploaded files, which may have other references.

The version-1 channel validates sender, origin, session/runtime/artifact identity, ordering, finite values, keys, depth (8), array length (64) and total serialized size (16 MiB). Uploaded images cross as asset URLs rather than repeated data strings. Rejected snapshots and updates report errors, and fresh-capture timeouts prevent stale saves. Preview separation is not a security sandbox for untrusted repository code.

## Enable, disable and remove

Use the standard managed commands and settings. Disable retains module files. Remove previews the deletion before `--yes`. Both protect dependent public-library consumers: first save/detach connected views through their View menus. Empty workspace declarations may remain dormant while unavailable. Neither operation silently resets a design or inserts fallback implementations. Re-enable makes dormant workspaces available again. Packages follow Studio's existing policy and remain installed after removal until explicitly cleaned up.

The module's agent guidance and human Manual chapter follow availability. [Module conventions](../../platform/context/modules.md) govern installation, public boundaries, shared settings and removal. [Human controls](../../platform/modules/documentation/pages/dialkit.md) describe the workflow.

## Verification

Ordinary tests cover source transforms, group mismatch, attachment inventory, image imports, retries, ownership, sizes, symlinks and protocol guards. `lifecycle.integration.test.js` creates disposable no-system and Product prototypes and runs real CLI operations plus production builds with the module enabled, disabled, re-enabled and physically removed. It asserts that tuned source and metadata survive and removed code is absent from output. Run it through `pnpm test:release`.
