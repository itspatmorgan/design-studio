---
title: DialKit
description: Tune a view with live dials and apply the values to its code.
order: 4.5
module: dialkit
toc: true
---

## Tune a view

Right-click a view in the prototype's navigation and choose **Add DialKit**. A panel appears over the view. Ask your agent for the dials you want, such as card spacing, corner radius, or type size.

Drag the dials and the view updates as you go. **Save version** keeps a tuning so you can compare it with others. Tuning lasts until you reload the view.

## Apply it to the code

When it looks right, press **Apply to code**. The values become the dials' new defaults in the view's code, so they stay after a reload and your agent sees them too.

If the file changed since the view loaded, Apply stops rather than overwrite it. Wait for the view to update and press it again.

## Hide or remove it

- **Hide DialKit** in the prototype's menu, or ⌘⇧; (Ctrl+Shift+; on Windows and Linux), hides the panel to see the view on its own. Do it again to show it.
- **Remove DialKit** in the view's menu keeps the design as you tuned it and takes the dials out of the code.

DialKit is a building tool: published sites and views embedded in documents or canvases never show it.
