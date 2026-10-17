# Design Studio

Read [working context](context/working-in-studio.md) at the start of each session. Before changing upstream-owned paths, read the relevant [ownership tiers](context/ownership.md#tiers) and [path map](context/ownership.md#path-map).

Before editing an existing contributor-owned prototype, use `pnpm studio context src/prototypes/<key>/<id> --json` to resolve contributor scope, assignment, and pending rebuild. For creation or other content, resolve the contributor with `node src/platform/node/cli/resolve-contributor.js`. Explicit `systemId: null` means no system; missing assignments are invalid. The default is written explicitly at creation. Read the assigned system's `AGENTS.md` and relevant context. For a pending rebuild, read the target system too and preserve the original.

Use the [platform README](README.md) as an index when locating shared context, skills, or implementation. For platform product or architecture decisions, read [Principles](context/principles.md) and [Personas](context/personas.md). For Studio interface work, read [Studio instructions](systems/studio/AGENTS.md).

Skills are owned by the platform, enabled modules, and registered systems. Inspect their names and descriptions, then read applicable procedures and supporting files. The generated project skill adapters expose the same canonical sources to coding harnesses. A system skill applies only to that system's assigned prototypes or explicit system maintenance.

- For configuring a running studio, or updating it to a newer Design Studio release, use [configure-studio](skills/configure-studio/SKILL.md). Missing dependencies alone do not mean initialization is needed.
- For contributor registration, use [setup-contributor](skills/setup-contributor/SKILL.md).
- For module or system installation, creation, availability, or removal, use [manage-modules](skills/manage-modules/SKILL.md).
- For shared context or skills, use [maintain-context](skills/maintain-context/SKILL.md).
- For owner READMEs, Manual coordination, or guidance audits, use [maintain-documentation](skills/maintain-documentation/SKILL.md).
- For an explicit design-system review, use [check-design-system](skills/check-design-system/SKILL.md).

Use pnpm. Reuse unchanged instructions already read; read source before editing. Save verbose check output to a temporary log and report results and warnings concisely.

The human Manual lives in `src/platform/modules/documentation/pages/`; technical requirements live in owner READMEs and context documents. Update affected guidance with platform behavior changes. For routing work, consult [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview).
