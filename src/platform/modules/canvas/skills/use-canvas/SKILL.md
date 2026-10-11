---
name: use-canvas
description: "Create or edit a Design Studio canvas containing views, diagrams, documents, notes, and arrows. Use only when Canvas is enabled."
---

# Use Canvas

This skill applies when Canvases is enabled. The [module README](../../README.md) describes rendering and storage.

- Keep embedded artifacts within the canvas's own prototype. Copy another prototype's artifact before embedding it.
- Do not store images in a canvas. Embed the working view instead.
- Apply the [contributor scope](../../../../context/contributor-scope.md) before editing.
- Inspect the current scene before changing it. Inspect the result afterward.
- Preserve the person's arrangements. Move existing content only when the request requires it.
- Keep changes small enough to review and undo. Live tool operations support undo. External file edits may not be separate undo steps.

## Discover and use tools

Read current tool help instead of assuming argument names or defaults:

```sh
pnpm canvas help
pnpm canvas help create
```

For file operations, run `pnpm canvas <file.excalidraw> <tool> '<json>'`.

For an open local canvas, compatible browser tools can use `window.__studioCanvas`. Read its `help()` before use.

Use `describe` before and after changes. For live tools, use `context` when the request refers to the current selection or viewport.

Prefer tools over manual JSON edits. They maintain element bindings and versions. Use `point` to identify an artifact when live access supports it.

Create a canvas through the file menu or write this empty scene:

```json
{"type":"excalidraw","version":2,"studioVersion":1,"elements":[],"appState":{"viewBackgroundColor":"#ffffff"},"files":{}}
```

After writing new prototype artifact files directly, run `pnpm studio identify src/prototypes/<key>/<prototype> --json` to preview missing identity assignments, then `--yes` to apply. Preserve existing identity metadata when editing. System context and helpers do not need artifact IDs.

## Verify

Inspect the updated scene with describe, then inspect the rendered canvas and embedded artifacts. Preserve bindings and existing arrangements. Follow the platform working context for required checks and report the canvas link.
