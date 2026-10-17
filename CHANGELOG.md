# Changelog

## Unreleased

## 0.1.1 (2026-10-17)

A leaner foundation with the same core Studio experience. This beta release simplifies development and maintenance workflows while retaining data-integrity, identity, permissions, and recovery checks.

- Replace managed upgrades and scripted releases with reviewed Git workflows.
- Retire managed extension downloads and provenance locks; keep local module/system scaffolding and integrate external source through reviewed repository edits.
- Discover regression tests directly, simplify CI, and retain individual module-availability probes alongside two combined production configurations.
- Remove compatibility snapshots, benchmark machinery, duplicate tests, and repeated build/type checks.
- Consolidate agent maintenance guidance and use the installed upstream shadcn CLI in a disposable workspace instead of a Studio wrapper.
- Report immediate Studio/preview startup sizes and the largest deferred chunks in build inspection.

### Updating from 0.1.0

Review the release diff and merge the release tag on an upgrade branch using [manual upgrade guidance](src/platform/context/ownership.md#updating-a-studio). Preserve local work, reconcile dependencies, run `pnpm studio sync`, and verify the affected workflows before merging.

- `pnpm studio update` and `pnpm release` are removed. Use the documented manual Git upgrade and release procedures.
- `pnpm studio add` and `create-module`/`create-system --out` are removed. Scaffold locally, then review and integrate external source and dependencies manually.
- `pnpm prepare-shadcn` is removed. Follow [manual shadcn staging](src/platform/modules/systems/skills/setup-design-system/references/shadcn.md#manual-staging); never run upstream initialization in Studio or a system source folder.
- `pnpm test:changed` and `pnpm contract` are removed. Use `pnpm test`, `pnpm test:release`, and the production build. Public declarations and current consumers are the source of truth; this beta has no backwards-compatibility gate.
- The optional `ModuleSpec.upstream` field is removed. Keep meaningful source provenance in the owner's documentation and preserve required license notices.
- `.studio/ownership.json` and `studio.lock.json` are no longer read. Git records maintenance history; contributor permissions and permanent identities remain enforced separately.

## 0.1.0 (2026-10-14)

Design Studio’s first public beta, 0.1.0. Build and explore product ideas with your coding agent in a local workspace you can make your own.

- Create interactive screens, documents, diagrams, and canvases together in a prototype.
- Use design systems to share components, themes, and project context across your work.
- Explore the Feedback Inbox and Marketing examples, including working screens, alternate states, and an annotated handoff canvas.
- Customize the full source code and publish a read-only site for others to try.
- Improved first-visit onboarding, studio and file updates, and permanent links to your work.

This is early beta. Published sites have no built-in sign-in; use your hosting provider’s access controls for private work.
