---
title: Select
description: "A field that opens a list of options and keeps the one you pick, like choosing the prototype to publish as a tool."
---

## When to use

Use a select when someone must pick exactly one option from a list that is too long, or too variable, to show all at once. For a few fixed options, use tabs or radio buttons. For actions, use a dropdown menu.

## Behavior

- It opens a list under the field. Arrow keys move through it, and typing jumps to an option by its name.
- Pass `items` to the select so the field shows an option's label while the list holds its value.
- It has no selection until the person picks one, and shows its placeholder until then.
