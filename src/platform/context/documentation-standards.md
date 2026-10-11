---
title: Documentation standards
description: Where platform context belongs, how to write it, and when to verify and update it.
toc: true
---

Documentation is part of the platform. Keep it accurate as behavior changes. This standard applies to the Manual, module documentation, system content, and agent instructions.

## Author for the right reader

Choose the authoritative location using [Responsibilities](contracts-and-instructions.md). Use [Agent context routing](agent-context.md) for discovery and generated harness entries.

Documentation has two reading choices: Manual provides a compact product reference, and Context and Skills displays original platform and module files. Systems exposes system context and skills alongside its toolkit. Human chapters live only in `src/platform/modules/documentation/pages/`. Platform, module, and system context preserve knowledge under their respective owners. Context and Skills access remains available when the optional Documentation module is disabled.

Give each contract one authoritative location. Other documents can summarize its purpose, then link to it. Do not copy requirements, schemas, or procedures into multiple locations.

Write the Manual as a compact product reference, not a course. Organize around questions about capabilities, controls, consequences, and recovery. Use diagrams when they explain relationships faster than prose. Keep guided projects and exercises outside the Manual. Keep detailed commands, file contracts, and technical troubleshooting in owner context. A supporting module does not need a separate Manual chapter.

Code defines implemented behavior. Documentation explains that behavior and the intended constraints. If they disagree, identify whether the implementation or the documentation needs correction.

Associate a capability’s Manual chapter through `module: <id>` so disabling or removal hides the human chapter without relocating its source. Keep shared standards in platform context.

File-backed navigation follows the [shared source workflow](source.md). Expose source editing through navigation and the common keyboard toggle. Keep source-file mappings explicit for generated pages or pages backed by several files.

## Write clearly

Use ASD-STE100-inspired language with flexibility for our [personas](personas.md). This is a writing approach, not a claim of formal compliance.

- Use familiar words and active voice. Address the reader directly when giving instructions.
- Keep one main idea in each sentence. Aim for 20 words in instructions and 25 words in descriptions; split longer sentences when useful.
- Use one term for one concept. Match labels, commands, paths, and configuration keys exactly.
- State a condition before its action: “If Canvases is disabled, skip canvas verification.”
- Use numbered steps when order matters. Use bullets for independent requirements or options.
- Distinguish requirements from recommendations, defaults, and examples. Use “must” only for a requirement.
- Define unfamiliar terms on first use. Include technical details only when the audience needs them.
- Describe what the environment provides. Leave each team free to choose its design process.
- State assumptions, limitations, and missing input. Do not present planned capabilities as available features.
- Write guidance for ongoing use. Keep release-stage commentary, dated test results, and rollout plans in maintainer records. Include version-specific details only when they change a required action, such as an installation migration.

Context documents use a frontmatter `title` and start their body without a duplicate H1. Use H2 headings for sections. A skill keeps its required `name` and `description`; its optional opening H1 names the task, such as “Use Canvas.” READMEs may use an opening H1 without frontmatter. The reader suppresses a matching opening H1 when a frontmatter title is present.

Choose a context title that clearly names its subject. Navigation and the document heading use this same declared title. Keep the filename stable when refining a display title.

Agent instructions should be direct and task-specific. Keep skill descriptions precise enough to select the right task. Put substantial conditional details in linked references.

## Divide skills and code

Keep decisions, meaningful task order, and outcome review in skills. Put repeatable mechanics with known inputs and outputs in commands, scaffolds, or validators. Reuse existing tools before adding another implementation. A skill should invoke them and handle decisions or reported failures, rather than recreate their logic.

Give each instruction a task and a decision it changes. Keep the common path visible; link optional branches and complete relevant contract sections. Exact schemas belong in their contract or types. Keep brief reminders where a wrong choice risks existing work, but link shared operating policy instead of repeating completion checklists.

Do not use a word limit as a quality gate. Review the material and actions a task activates, including nested skills. Match completion criteria to the requested outcome. Code can validate structure and resolve facts; the agent still judges relevance, fidelity, and the rendered experience.

## Use visual aids deliberately

Use a table for comparisons or mappings. Use a diagram when relationships or sequence are difficult to explain in text.

Use fenced `mermaid` blocks for diagrams in platform Markdown. The shared reader renders them in the Manual, system context, owner overviews, and prototype Documents. Include `accTitle` and `accDescr` for accessible descriptions. Keep the text in the document so people and agents can review and revise it.

Use screenshots only when the interface itself matters and the document location supports them. Include useful text descriptions and keep visuals current.

Store images under the owning scope’s assets using the [asset convention](assets.md). Link to them from the document and include useful alternative text. A visual aid should clarify the content, not repeat it.

## Update with the platform

Review affected documentation when changing a capability, default, command, configuration field, file format, scope boundary, or setup procedure.

Update its authoritative source and affected summaries in the same change. Check incoming links and agent routing when moving or removing a document.

For an optional module, check guidance with the module enabled, disabled, and removed. Avoid unconditional instructions for optional capabilities.

Before a release, audit the complete documentation set. After a reported misunderstanding or failed agent task, review the relevant guidance.

Fix the demonstrated problem. Do not turn every past failure into a universal rule or add a second source to patch a stale one.

## Verify the result

Use the [Maintain documentation skill](../skills/maintain-documentation/SKILL.md) for the review procedure.

Verify behavior against implementation and current command help. For upstream facts, use current official documentation rather than copied manuals.

Check links, anchors, metadata, and rendered content. For skills, review requests that should activate them and similar requests that should not. Check that standing context routes apply to the intended scope.

Build checks validate structure, types, and selected contracts. They do not prove factual accuracy, readable prose, or correct agent decisions.

Report automated checks, manual review, and live behavior testing separately. Keep unresolved questions visible.
