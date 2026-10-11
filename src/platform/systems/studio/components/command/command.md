---
title: Command
description: A searchable list of actions. The ⌘K palette is built on it.
---

## When to use

Use it for a menu of actions or pages a person searches by typing.

## Focus when closing

CommandDialog accepts DialogContent’s finalFocus option for callers that manage their own opening interaction. Studio’s palette restores only the element focused at opening; if none was focused, it does not pick an older navigation target. Choosing a destination leaves focus handling to the destination page.

Palette opening context is shared separately from its provider so development updates preserve the button connections. Closed dialog surfaces stop receiving pointer events while their exit animation finishes.
