---
name: maintain-context
description: "Create or revise canonical context documents and task skills for the platform, a module, or an assigned system. Use maintain-documentation for READMEs, Manual coordination, or a guidance audit."
---

## Choose the source

Read [Responsibilities](../../context/contracts-and-instructions.md) to choose the owner and [Documentation standards](../../context/documentation-standards.md) for writing and metadata. Resolve the assigned system before authoring product guidance for a prototype.

Inspect the owner's README and related context or skills. Reuse an existing source when it owns the subject. Split material only when the subjects have distinct purposes or consumers. Preserve supplied principles and personas; do not invent research, facts, or product decisions.

## Author and expose

1. Write knowledge and standing requirements in the owner's `context/`. Write recognizable task procedures in `skills/<name>/SKILL.md`, with matching lowercase, hyphenated folder and frontmatter name.
2. Give the skill a precise trigger, necessary input, decision steps, and completion criteria. Reuse commands for deterministic mechanics; add code under its owner when a demonstrated gap needs it. Keep optional branches in supporting references. Link contracts and standing policy instead of copying them. A short convention can remain context.
3. Update the owner's README and affected callers. For a module task route, use a module-relative `instructions` path. For discovery changes, consult [Agent context routing](../../context/agent-context.md).
4. After changing skills or capability availability, run `pnpm studio sync`. Inspect warnings and preserve user-authored adapter entries; generated entries are not authoring sources.

Root `AGENTS.md` is generated; never edit it. Change upstream agent guidance in `src/platform/AGENTS.md` (with links relative to that file) and the team's own in `AGENTS.team.md`, then run `pnpm studio sync`.

## Verify

Check metadata, links, rendered headings, correct ownership, and source access. For skills, walk through requests that should and should not activate them, including disabled modules and unrelated systems. Check the full reading and action path for unnecessary work. Verify new mechanics with representative inputs and failures. Follow platform working context for required checks and commits.

Report canonical sources changed, synchronization results, and unresolved verification. Use [Maintain Documentation](../maintain-documentation/SKILL.md) when a broader consistency audit is needed.
