# Design Studio Starter

Read [working context](src/platform/context/working-in-studio.md) at the start of each session. Preserve existing work and respect the person's explicit choices and authorization. Before changing upstream-owned paths, read [Ownership and updates](src/platform/context/ownership.md).

Before editing an existing contributor-owned prototype, use `pnpm studio context src/prototypes/<key>/<id> --json` to resolve contributor scope, assignment, and pending rebuild. For creation or other content, resolve the contributor with `node scripts/cli/resolve-contributor.js`. Explicit `systemId: null` means no system; missing assignments are invalid. The default is written explicitly at creation. Read the assigned system's `AGENTS.md` and relevant context. For a pending rebuild, read the target system too and preserve the original.

Start with the [platform README](src/platform/README.md) to locate shared context, skills, and implementation. For platform product or architecture decisions, read [Principles](src/platform/context/principles.md) and [Personas](src/platform/context/personas.md). For Studio interface work, read [Studio instructions](src/systems/studio/AGENTS.md).

Skills are owned by the platform, enabled modules, and registered systems. Inspect their names and descriptions, then read applicable procedures and supporting files. The generated project skill adapters expose the same canonical sources to coding harnesses. A system skill applies only to that system's assigned prototypes or explicit system maintenance.

- For configuring a running studio, use [configure-studio](src/platform/skills/configure-studio/SKILL.md). Missing dependencies alone do not mean initialization is needed.
- For contributor registration, use [setup-contributor](src/platform/skills/setup-contributor/SKILL.md).
- For module or system installation, creation, availability, or removal, use [manage-modules](src/platform/skills/manage-modules/SKILL.md).
- For shared context or skills, use [maintain-context](src/platform/skills/maintain-context/SKILL.md).
- For documentation creation, revision, or audits, use [maintain-documentation](src/platform/skills/maintain-documentation/SKILL.md).
- For an explicit design-system review, use [check-design-system](src/platform/skills/check-design-system/SKILL.md).

<!-- studio:modules -->
When the person asks for a canvas (a page of views, documents, and notes arranged together), read [src/modules/canvas/skills/use-canvas/SKILL.md](src/modules/canvas/skills/use-canvas/SKILL.md).
When the person asks to assign or review team Admins, system maintainers, or contributor permissions, read [src/modules/contributors/skills/use-contributors/SKILL.md](src/modules/contributors/skills/use-contributors/SKILL.md).
When the person asks for a standalone diagram inside a prototype, read [src/modules/diagrams/skills/create-diagram/SKILL.md](src/modules/diagrams/skills/create-diagram/SKILL.md).
When the person asks for a document inside a prototype, read [src/modules/document/skills/write-document/SKILL.md](src/modules/document/skills/write-document/SKILL.md).
When the person asks to add or change the human Manual, read [src/modules/documentation/skills/write-manual/SKILL.md](src/modules/documentation/skills/write-manual/SKILL.md).
When the person asks for a first tour of the studio or help getting started after installation, read [src/modules/onboarding/skills/use-onboarding/SKILL.md](src/modules/onboarding/skills/use-onboarding/SKILL.md).
When the person asks to create or edit interactive prototype views, read [src/modules/prototypes/skills/build-prototype/SKILL.md](src/modules/prototypes/skills/build-prototype/SKILL.md).
When the person asks to rename, move, duplicate, archive, restore, or remove a prototype, read [src/modules/prototypes/skills/organize-prototype/SKILL.md](src/modules/prototypes/skills/organize-prototype/SKILL.md).
When the person asks to curate, assess, import, replace, or adapt a design system, read [src/modules/systems/skills/setup-design-system/SKILL.md](src/modules/systems/skills/setup-design-system/SKILL.md).
When the person asks to import or document a system component, read [src/modules/systems/skills/document-component/SKILL.md](src/modules/systems/skills/document-component/SKILL.md).
<!-- /studio:modules -->

Use pnpm for project commands. Reuse instructions already read while available and unchanged; retrieve missing or stale instructions after compaction or file changes. Re-read source files before editing them. Use targeted searches and bounded reads; read applicable skill procedures in full. Save verbose check output to a temporary log, inspect final exit status and warnings, and report concise results with its path.

The human Manual lives in `src/modules/documentation/pages/`; technical requirements live in owner READMEs and context documents. Update affected guidance with platform behavior changes. For routing work, consult [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview).
