---
name: organize-prototype
description: "Rename, move, duplicate, archive, restore, download, or remove a Design Studio prototype and preserve its links and original work."
---

# Organize a prototype

Use `pnpm studio context src/prototypes/<key>/<id> --json` to inspect assignment, rebuild, and contributor scope. Inspect metadata and incoming links before structural changes. Read the relevant [prototype contract](../../README.md) sections for the requested operation.

The prototype's **…** menu and these commands are the same actions, with the same names and ownership checks. Use them instead of editing folders or `meta.json` by hand:

- `pnpm studio rename <folder> --title "..."`: retitles it, renames its folder to match, and repairs its links.
- `pnpm studio duplicate <folder> [--title "..."] [--system <id> | --no-system]`: a copy in the same contributor folder, titled "<title> copy" unless given; a different system records a rebuild request.
- `pnpm studio archive <folder>` / `pnpm studio restore <folder>`
- `pnpm studio delete <folder> --yes`: moves it to the Trash. Without `--yes` it only says what it would delete.

For a move between contributors or another change no command covers, update folder paths, metadata ordering, and internal links together. Report external incoming links for their owners to update. For duplication, preserve the source and operate in the new exploration; a requested system rebuild follows [build-prototype](../build-prototype/SKILL.md).

The running dev server repairs known internal references for app moves and identifiable filesystem renames. Check the result before making further replacements; avoid applying the same relative-path rewrite twice. For offline moves or dynamic paths, update references explicitly. Automatic repair does not update incoming links in another prototype.

## Archive or restore

Read the prototype contract's [archiving and deployment definition](../../README.md#archiving-and-deployment) before changing publication status. It owns status values, scope, and exclusion behavior.

- Prefer archiving when the person wants to set work aside for later. Delete only when requested.
- Archive or restore the whole prototype with the commands above. Do not invent per-artifact status fields.
- Check active links before archiving and resolve warnings about excluded targets.

The [Prototypes chapter](../../../documentation/pages/prototypes.md#how-do-i-organize-artifacts) explains the local controls when the Manual is enabled.

## Download

To share a prototype with someone who can't open the studio, run `pnpm studio download src/prototypes/<key>/<id>`, the same **Download** as the prototype's menu. It saves one HTML file to `~/Downloads/<id>.html` (or `--out <file>`) and takes about as long as `pnpm build`. Tell the person where the file is. Files a view fetches at run time, such as from `public/`, aren't included; see [Download](../../README.md#download).

## Verify

Check navigation, retained links, and requested publication status. Follow the platform working context for build and commit requirements. Report preserved originals and any unresolved incoming links.
