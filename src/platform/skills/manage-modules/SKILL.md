---
name: manage-modules
description: "Create, install, enable, disable, or remove modules; create, rename, archive, restore, or delete systems through the Studio CLI."
---

# Manage Modules

Read the relevant [module contract](../../context/modules.md) sections for capability changes. System authoring uses the [system contract](../../modules/systems/README.md).

- Use managed commands for registration, availability, lock files, and instruction synchronization. Scaffolds write required declarations; validation reports missing fields. Discovery alone does not activate a capability.
- Supplied modules are in `src/platform/modules/` and the team's own in `src/modules/`. `create-module` and `add` write only to `src/modules/`, and a new module can't reuse a supplied module's id. Enable, disable, and remove work in whichever root holds the module.
- Run commands for the person. Use CLI help and previews for current arguments and proposed file changes.
- Preview `add`, `remove`, and `create-*` before applying them with `--yes`.
- For system lifecycle changes, read the [Systems contract](../../modules/systems/README.md#system-lifecycle). Preview `rename-system`, `archive-system`, `restore-system`, or `delete-system` before `--yes`. Rename repairs local references automatically. Archive preserves source and archives associated active prototypes. Delete permanently removes system source; retained prototypes need a rebuild. Choose another default before archive or deletion, and resolve whether restoration includes associated prototypes.
- Apply already-authorized choices without asking again. Ask for unresolved source, scope, or destructive choices.
- Treat installed modules as trusted code, not sandboxed data. Review the source and proposed dependencies before installation.
- Do not manually edit `studio.lock.json`, the generated module routing in `AGENTS.md`, or config module flags. Use studio commands.
- Do not bypass required-module constraints or unresolved dependencies with `--force`.
- If the license check rejects a source, obtain the person's decision before using `--allow-license`.
- Restart the dev server after CLI configuration, module installation, or system installation changes. Saving in local Studio settings restarts it automatically. Ordinary component edits update during development.
- Use the configuration command to change the default system. Preserve existing prototypes until intentional migration.
- Applied shared commands require an Admin. Assigned maintainers may use managed rename for their active systems. Use `configure --maintainers system=key,key --yes` for grants. Reserve `configure --recovery` for explicitly authorized setup or permission recovery.
- Apply the [contributor scope](../../context/contributor-scope.md) to shared changes.

Use `pnpm studio list` to inspect installed modules and `pnpm check` to validate their contracts.

The command synchronizes module-owned agent routing. Disabled module instructions must not direct work on unavailable features.
