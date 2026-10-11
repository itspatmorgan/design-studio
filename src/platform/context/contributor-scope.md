---
title: Contributor scope
description: Contributor ownership, authorization for shared changes, and identity checks.
---

Resolve the contributor with `node src/platform/node/cli/resolve-contributor.js` before changing repository content. Read their profile and the current grants in `studio.config.json`.

| Authority | Direct work |
| --- | --- |
| Contributor | Their own `src/prototypes/<key>/` and profile preferences. |
| Assigned system maintainer | Contributor scope plus the assigned active system's components, theme, assets, context, and skills. Managed rename is supported. |
| Admin | All prototypes, active systems, platform, modules, configuration, and permission assignments. System creation, default selection, archive, restore, and deletion. |

Personal studios give the resolved registered contributor Admin authority. Team studios require Contributors & Permissions and declare Admins and per-system maintainer assignments centrally. The module owns management workflows. The platform owns identity and policy. A maintainer assignment is a grant for one system, not a third studio-wide role. Studio is the required platform system and has no maintainer grants. Restore archived systems before routine editing.

For missing registration, follow [setup-contributor](../skills/setup-contributor/SKILL.md). Use `pnpm join` for registration. Profiles contain identity and preferences, never authority. Do not overwrite another person's profile or change identity to obtain their scope.

Outside the person's direct scope, prepare a pull request proposal for the relevant owner to review. A specific Admin authorization covers necessary shared implementation. Preserve existing user work and do not change another owner's working branch by default. Maintainer system renames may repair configuration and dependent prototypes outside their normal scope. Use the managed rename operation and include those repairs in a reviewed proposal.

Prototype `ownerContributorId` must match the permanent contributor ID declared for its source folder. Moving a folder cannot grant ownership. Central grants persist IDs independently of source keys and display names. Local app and CLI actions resolve current source locations and recheck grants. Local Git hooks report scope. Personal studios skip team Git scope checks; identity invariants still apply. CI checks team identities, assignments, and active system status from the before-side revision so proposed changes cannot grant themselves authority. Reviewed pull requests may propose changes anywhere. Repository protection and required reviews remain the Admin's responsibility.

These rules guide people and agents. They are not filesystem authentication or GitHub permissions. Direct repository edits remain possible. Runtime dependency boundaries still apply to Admins and maintainers.
