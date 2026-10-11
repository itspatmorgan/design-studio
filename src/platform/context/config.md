---
title: "Studio configuration"
---

`studio.config.ts` holds a small set of shared choices. Other customization happens in code, which you also own.

The starter declares personal use. Contributors & Permissions is installed but disabled until you switch to team use. Personal use gives the registered local contributor Admin access and skips team ownership checks. Build, asset, and dependency checks still apply.

## Change configuration

Open **Studio settings** from the gear icon or search while running Studio locally. Contributors can inspect settings. Admins can edit basic configuration and optional module states. Team Admins assign studio and system permissions on the local **Contributors** page. Identity and profile preferences remain in repository files.

Saving writes repository files, synchronizes module-owned agent instructions, and restarts the development server. Stale configuration or contributor snapshots are rejected. Reload settings before retrying a conflicting save. Settings and its editing API are excluded from the published viewing site.

Welcome records its first display on the resolved contributor’s profile with `welcomeDismissed: true`. When Onboarding is enabled, every contributor must explicitly declare this boolean. Registration writes `false`. Missing declarations are validation errors. Each contributor gets the introduction independently; progress updates do not change studio settings or restart the server. See the [Onboarding contract](../modules/onboarding/README.md) for progress behavior.

You can also ask your agent to configure the studio. The configuration command previews changes before applying them. The CLI and settings API share validation, source editing, assignment preservation, and module instruction synchronization.

Use `pnpm studio configure --system <id>` to preview a default-system change. Apply with `--yes` after reviewing the preview. Creation writes the chosen system ID to each prototype. Changing the default affects future prototypes; existing assignments remain unchanged.

Every prototype must declare `systemId`, including `null` for no system. Missing assignments fail validation. Migrating an existing prototype requires changing its component imports and explicit assignment together.

For manually edited module configuration, run `pnpm studio sync` to refresh agent task routes. Restart the dev server after CLI configuration changes. Coordinate shared configuration changes with your Admin.

## Local roles and contributors

Studio has two local roles: Contributor and Admin. Registered people are Contributors by default. In team use, `admins` must contain at least one registered contributor ID; several Admins are supported. In personal use, the resolved local contributor is automatically an Admin. Team use requires the Contributors & Permissions module installed and enabled. Personal use can disable or remove it. Unregistered identities cannot save settings.

The settings server checks the current role before applying each save. Only existing Admins can save shared settings. The API still validates Admin assignments in its configuration payload; saving cannot remove the last team Admin. These roles guide local behavior. Admins can manage all prototypes. Contributors retain direct write access to their own folders. Per-system maintainer grants add active system editing and managed rename. Archive, restore, deletion, creation, and default selection remain Admin actions. These grants do not authenticate people or grant GitHub permissions. Existing section-specific artifact policies remain separate.

Use `pnpm studio configure --admins sam,alex --yes` to assign team Admins. Applied shared CLI changes require the current Admin. For explicitly authorized initial setup or recovery, use `configure --recovery --admins sam --yes`. This visible repository-level recovery bypass is limited to configuration and does not bypass Git review. Direct file edits remain possible.

Keep shared choices in `studio.config.ts`. Contributor profiles live in `contributors/<key>.json`; `pnpm join` creates these files. Each file declares one contributor, with a permanent `studioId` and its filename as the current source key. There is no combined roster file. Profiles declare a permanent `studioId`, a nonempty `name`, plus `email` and `github` strings. An empty string explicitly means that identity is unavailable. Nonempty emails and GitHub usernames must be unique, ignoring case. When Onboarding is enabled, profiles also declare `welcomeDismissed`. Other preference fields stay with the profile. Profiles do not declare authority. Use `pnpm studio configure --maintainers product=sam,alex --yes` to assign one system. Use `product=` to clear it. The command preserves other system assignments.

CLI and settings controls use current readable source keys for selection. Managed saves serialize relationships as permanent IDs. The `systems` registration list describes source locations; it is intentionally separate from `defaultSystem`, Admin IDs, and maintainer grants. Unknown IDs are errors. See [Resource identity](resource-identity.md).

## Configuration fields

| Setting | Declaration |
| --- | --- |
| `name` | Required studio name, used by the app. |
| `usage` | Required `personal` or `team`. Personal derives local Admin authority and skips team Git scope checks. Team requires Contributors & Permissions enabled and explicit Admin assignments. |
| `admins` | Unique permanent registered contributor IDs. Required and nonempty in team use; personal use derives Admin access from local identity. |
| `systemMaintainers` | Required object with every registered prototype-system permanent ID explicitly mapped to unique permanent contributor IDs. Use `[]` for unassigned systems. Studio cannot have an entry. Rename retains the entry, deletion removes it, and archiving preserves it for restoration. |
| `tagline` | Optional line on the published front page, up to 140 characters. |
| `modules` | Installed module IDs set to `true` or `false`. Every installed module needs an explicit entry; omission is invalid and never enables it. Required modules cannot be disabled. |
| `systems` | Required list of every installed system source-folder key, including the required Studio system (`studio` in the starter). Discovery does not register a system. |
| `defaultSystem` | System selected when creating a prototype without a different requested choice. Required permanent registered prototype-system ID; no alphabetical fallback. |

## Inspect setup

The agent can run `pnpm studio status --json` to inspect configuration and setup state. This report does not replace a build and review of a working prototype.

For capabilities and removal behavior, see [Module contract](/documentation/context/platform.core/context/modules).

## Team management ownership

Contributors & Permissions owns the management interface and assignment workflows. When installed, its contract is `src/platform/modules/contributors/README.md`. The platform owns profiles, central grants, settings transactions, and permission decisions. Optional management surfaces cannot disable enforcement. The public `useStudioSettings` client supports field-scoped saves with conflict detection and unsaved-change protection.

In Studio settings, switching to team use enables the installed Contributors & Permissions module. Existing Admin assignments remain. If there are none, the current registered contributor becomes the first Admin. CLI setup declares Admins and module availability explicitly.
