---
title: Item
description: A row for one thing in a list, with an icon, a title and actions.
---

## When to use

Use an item for each entry in a list the reader scans or opens, like the prototypes on the Prototypes page when it is shown as a list. Group items with `ItemGroup`.

Render it as a link with the `render` prop (`<Item render={<Link … />}>`) when the whole row opens something. Use a [card](/systems/studio/components/card) instead when each entry needs more room.
