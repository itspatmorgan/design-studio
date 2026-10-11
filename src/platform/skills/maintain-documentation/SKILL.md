---
name: maintain-documentation
description: "Revise owner READMEs, coordinate Manual updates, or audit consistency across contracts, context, and skills after platform changes. Use maintain-context to author context or task procedures."
---

## Establish scope

Read the [documentation standard](../../context/documentation-standards.md) and [ownership foundation](../../context/contracts-and-instructions.md). Use maintain-context when authoring context or skills.

For Manual chapter edits when Documentation is enabled, follow the [write-manual skill](../../modules/documentation/skills/write-manual/SKILL.md). For component pages, use [document-component](../../modules/systems/skills/document-component/SKILL.md).

Identify the audience, requested outcome, and affected behavior. Preserve current user edits. Limit a focused update to relevant documents.

## Verify and revise

1. Find the authoritative source and its callers. Check the implementation, current command help, and relevant upstream sources.
2. Identify conflicting claims, repeated contracts, stale links, and missing context. Separate current behavior from intended or deferred behavior.
3. Update the authoritative document first. Replace repeated details with direct links and revise affected summaries.
4. Apply the writing standard. Add visual aids only when they clarify a relationship, choice, or action.
5. Check metadata, local links, anchors, optional-module conditions, and rendered content. Run repository checks appropriate to the changes.

For an audit, report actionable findings with file locations and recommended corrections. Do not imply that an audit request authorizes unrelated implementation.

## Agent guidance

Check whether task descriptions and `AGENTS.md` routing lead to the needed context without loading unrelated material.

Walk through realistic requests and similar requests that should not activate a skill. Check nested reads and completion steps, overlapping skills, existing authorization, disabled capabilities, and missing input. Identify deterministic instructions already owned by code or suitable for a shared command; keep judgment and outcome review in the skill.

When live agent testing is warranted, use an isolated workspace and authorized execution. Inspect decisions and resulting artifacts rather than testing exact wording.

## Completion

Report changes or findings, verification performed, and unresolved issues. Distinguish a routing walkthrough from a live agent test.

Follow repository requirements before committing. Keep deferred behavior and incomplete verification explicit.
