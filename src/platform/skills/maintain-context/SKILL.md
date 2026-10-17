---
name: maintain-context
description: "Create or revise canonical context documents and task skills for the platform, a module, or an assigned system. Use maintain-documentation for READMEs, Manual coordination, or a guidance audit."
---

## Author

1. Read [Responsibilities](../../context/contracts-and-instructions.md) and [Documentation standards](../../context/documentation-standards.md). Inspect the owner's README and existing source; update it rather than adding a parallel contract.
2. Keep knowledge and standing constraints in `context/`, task judgment in `skills/<name>/SKILL.md`, and exact schemas in code. Preserve supplied intent and facts; do not invent research or decisions. Link shared requirements instead of copying them.
3. Update affected links and the owner index. A module route uses a module-relative `instructions` path. System guidance applies only to assigned prototypes or explicit system maintenance.
4. After skill or routing changes, run `pnpm studio sync`. Root `AGENTS.md` is generated from `src/platform/AGENTS.md`, module routing, and `AGENTS.team.md`; edit those sources. Preserve team-authored adapters.

## Verify

Check relevant metadata, links, anchors, rendered content, and one matching/nonmatching skill request. Follow [working context](../../context/working-in-studio.md) for verification and saving. Report sources changed, sync results, and unresolved limits. A focused change does not require a broader guidance audit.
