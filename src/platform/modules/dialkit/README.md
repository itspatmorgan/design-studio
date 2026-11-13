# DialKit contract

An optional module for tuning a prototype view with [DialKit](https://github.com/joshpuckett/dialkit)'s live dials, then writing the tuned values into the view's code. It works with system and no-system prototypes. Its registered ID is `dialkit`; it appears as **DialKit** under Prototyping in Studio settings.

## In a view

A view imports `useDialKit` from `@module/dialkit`. It is DialKit's own hook, re-exported, so the config, controls, and returned values are DialKit's ([README](https://github.com/joshpuckett/dialkit#readme)). A view taken out of Studio keeps working by importing it from `dialkit` and rendering DialKit's `<DialRoot />`.

Apply and Remove rewrite the config in source, so they need:

- each group named by a unique string literal: `useDialKit('Card', { … })`;
- the config written as an object literal in the call, or in a `const` in the same file;
- each dial's default written as a literal: a number, `[default, min, max, step]`, a boolean, a string, or a typed control object.

Anything else fails with a message naming the dial, and nothing is written.

## Surfaces

- **Panel.** The library loads DialKit's panel only in a local Studio's view preview (`data-preview-surface="page"` on the preview document; [View contract](../view/README.md)). Published sites, document and canvas embeds, and production builds get the hook's values with no panel. Studio replaces the panel's Copy parameters button with **Apply to code**. DialKit's own versions and shortcuts are unchanged; tuning and versions stay in memory until reload.
- **Apply to code** writes every group's current values in the open view as their new defaults. It reads the file, prepares the new source through this module's `transform` route, and saves it with Studio's version-checked source write, so a file changed in the meantime is refused, not overwritten. Uploaded images can't be applied; pick one of the image control's options instead.
- **Add DialKit** and **Remove DialKit** are in a view's file-tree menu (`ModuleApp.artifactActions`). Add imports the hook and starts an empty group at the top of the view's component for the agent to fill. Remove replaces each group with a plain object of its values, using the open preview's live values when the view is open, and removes the import and any config constant only the hook used. Which one shows comes from `build.ts`, which lists the views that import the library.
- **Hide DialKit / Show DialKit** is in the open prototype's menu while any of its views uses DialKit, and on ⌘⇧; (Ctrl+Shift+; elsewhere) in the app or the preview. The choice is remembered in this browser.

## Implementation

- `lib/index.tsx`: the public hook; loads `lib/panel.tsx` in a local view preview.
- `lib/panel.tsx`: DialKit's panel, Apply, the shortcut, and live values for Remove.
- `lib/shared.ts`: the hidden setting, the shortcut, and the same-origin channel between the app and a preview.
- `node/source.ts`: the pure Add, Apply, and Remove source transforms, tested in `source.test.ts`; `server.ts` serves them. Neither reads or writes files.
- `app.tsx`: menu actions and the toast for a failed Apply. `build.ts`: the views that use DialKit.

`dialkit` and its `motion` peer are root dependencies. The panel loads DialKit's stylesheet, which the import guard allows for a module library because the package scopes it; repository CSS in module libraries and prototypes stays modular.

Disable or remove the module with the standard [module commands](../../context/modules.md#configuration-and-commands). Removing it is refused while a view still imports `@module/dialkit`: remove DialKit from those views first.
