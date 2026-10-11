---
name: use-contributors
description: Assign or review team Admins, system maintainers, and contributor permissions when Contributors & Permissions is enabled.
---

Read this module’s [contract](../../README.md) and the platform’s [contributor scope](../../../../context/contributor-scope.md).

1. Resolve the current contributor and read the current configuration and profiles. Use platform setup-contributor for registration, including personal use.
2. Identify the requested person and systems. Admin authority covers the entire studio. A non-admin needs an explicit grant for each system they will manage.
3. Review existing assignments. Preserve unrelated grants and at least one registered team Admin. Do not put authority in a profile.
4. Use **Contributors** or preview `pnpm studio configure --admins key,key` or `--maintainers system=key,key`. Apply the person’s authorized choice with `--yes`. The CLI preserves other assignments.
5. Verify effective access and report the scope granted. Changes save locally. Follow the team’s Git review workflow before sharing.

Do not use this skill for prototype creation, login, Git-provider permissions, or ordinary personal registration. Disabled modules cannot provide a team workflow. The platform still resolves identity and enforces its policy.

For switching personal/team use or recovery, follow platform configure-studio. Do not disable or remove this module in team use.
