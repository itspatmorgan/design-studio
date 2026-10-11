# Contributors & Permissions

This module owns team contributor management. Open **Contributors** in the local navigation to review people and assign permissions.

## Ownership

- `module.ts` declares the capability. `app.tsx` contributes local team navigation, search, and `/contributors`.
- `Contributors.tsx` owns the roster, assignment controls, and access explanations.
- [Use Contributors](skills/use-contributors/SKILL.md) owns assignment and access-review workflows.
- The platform owns contributor identity, profiles, configuration, and permission decisions. Its [contributor scope](../../context/contributor-scope.md) applies even when this module is absent.

The module uses the public `useStudioSettings` client and the platform settings service. The client sends only changed fields. Saves recheck current Admin authority and reject stale configuration or profile snapshots. This module writes only `admins` and `systemMaintainers`.

Profiles remain in `contributors/<key>.json`. They declare a permanent `studioId` and preferences; the filename supplies the current source key. Authority remains in `studio.config.json` as permanent contributor and system ID references. Controls select readable source keys; the settings service serializes IDs. See [Studio configuration](../../context/config.md) for the canonical schema. Registration remains a platform workflow because personal studios also need contributor identity.

## Availability

Team use requires this module installed and explicitly enabled. Configuration validation and managed removal enforce that requirement. Switching to personal use must precede disabling or removal.

Personal use gives the resolved registered contributor Admin authority. The module contributes no navigation or routes in personal use. It can be disabled or removed without affecting profiles, grants, prototype ownership, or the platform permission APIs. Retained assignments apply again when returning to team use.

The module is local only. Published viewing sites omit its navigation and routes and provide no settings server.

## Permissions

Contributors can inspect the roster and effective assignments. Only Admins can save permission changes. Admins have full studio access without individual system assignments.

Non-admins receive explicit assignments to active prototype systems. An assignment permits system editing and managed rename. System creation, default selection, archive, restore, and deletion remain Admin actions. Archived grants are preserved, but archived systems are not editable or assignable in this interface. Studio has no maintainer grants.

The platform's `canPerform` policy is shared by local editing and CI system checks. Hooks report team scope issues. CI uses before-side identities, mode, and grants so proposed changes cannot authorize themselves. Personal use skips team ownership checks. Dependency, declaration, and asset checks still run.

These are repository workflow permissions. This module does not authenticate users, grant Git-provider access, or replace branch protection and required reviews.

## Verification

Run `pnpm build`. Verify Admin and Contributor views, single and multiple system assignments, stale-save rejection, and last-Admin protection. In an isolated personal studio, verify disabling and physical removal without breaking the build. Team disabling and removal must fail before modifying files.
