---
title: DialKit
description: Tune a prototype, save its design, and remove controls when finished.
order: 4.5
module: dialkit
toc: true
---

## Add controls

Right-click a prototype View in navigation and choose **Add DialKit**. The floating sliders chip opens an empty panel. Ask your agent in chat to add dials for the things you want to refine, such as card spacing, corner radius or motion timing.

Each view has one workspace. It can contain several groups of controls. DialKit works with system-assigned and no-system prototypes. It currently supports prototype views rather than system component pages.

## Tune and save

Controls update the preview immediately. Expand and collapse groups as needed. The floating panel overlays the prototype without changing its preview width.

Choose **Save** in the panel header to write tuned defaults into the prototype's source while keeping its controls. Unsaved tuning can reset when you reload or leave the view. Native versions let you compare editable alternatives during tuning; they are separate from saved source history.

**Reset** restores the current source defaults. Uploaded images become files in the prototype's assets folder and must be smaller than 750 KB. Reset does not delete those files.

## Hide or remove

- **Collapse** closes the panel and keeps the sliders chip.
- **Hide DialKit** in the prototype actions menu hides both panel and chip. **Show DialKit** brings them back. Use ⌘⇧; on Mac or Ctrl+Shift+; elsewhere. Visibility resets on reload.
- **Remove DialKit** in the View's right-click menu preserves the current design in ordinary source and removes its controls. Open a connected view before removing its controls.

Adding DialKit again creates an empty workspace. Ask the agent for the new dials you want; the removed control schema is not restored automatically.

## Turn off the module

An Admin can disable DialKit in Studio settings. Save and remove connected controls from their views first. Dependency checks prevent disabling or uninstalling a module while prototype code still needs it. Disabling keeps the module files. Removal deletes the module implementation while preserving detached prototype designs and assets.

## Try published controls

Published views can opt into a DialKit playground. Open the sliders chip to tune and compare the design, then choose **Reset** to return to its starting values. Reloading also restores the saved design. These changes stay in your browser and do not change the shared prototype.

The Marketing landing pages and Feedback Inbox app views demonstrate this workflow. Published controls offer tuning and Reset; saving source and adding or removing DialKit require a local Studio. Views without a published-controls declaration show their saved design without the inspector.

## Recover from an error

If source changed or the preview became unavailable during Save/Remove, wait for a working preview and try again. A conflicting source edit is preserved. Give an unsupported-binding or control-schema error to your agent so it can adapt the source explicitly.
