# Agent context efficiency investigation

Historical evaluation notes from before the Context and Skills architecture. Rule counts and old file layouts below describe that evaluation snapshot; current guidance starts at [Platform](../../../README.md).

Investigated on 2026-10-04 against `6d4e5c7`. This is an evaluation plan and offline audit, not a new platform contract or an instruction to load during routine work. A six-run CLI pilot has since completed; see [Pilot results](pilot-results.md). Its browser limitations prevent an end-to-end equivalence claim. The [authorized follow-up](pilot-results.md#authorized-follow-up) records subsequent targeted instruction maintenance; mandatory context and checks remain required.

## Recommendation

Keep essential operating invariants immediately available. Retrieve task-specific instructions and authoritative contract sections as needed. Measure completed work, correct system resolution, and preservation of scope alongside context and latency. A shorter prompt is useful only if it preserves outcomes.

Start with bounded retrieval under the existing policy. Separately evaluate making some startup material conditional. Do not combine those changes in the first comparison; otherwise we cannot tell which caused a regression or saving.

## Current implementation

The [agent context contract](../../../context/agent-context.md) owns current routing. Studio does not inject a context bundle. The host supplies automatically discovered instructions; the agent reads linked files.

| Mechanism | Current source | Implication for context |
| --- | --- | --- |
| Session baseline | Root `AGENTS.md`, Prototype workflow, Contributor scope | Two rules are mandatory for every session, including explanation and platform tasks. |
| Studio work | Studio entry point, Principles, Personas | Full intent and audience context is required even for a small maintenance change. Root and Studio entry points both route to the same two context files. A competent reader can deduplicate them. |
| Prototype work | Metadata plus studio configuration, then assigned system entry point | Explicit None, default, named system, and rebuild target require different reads. The browser selector is irrelevant to this resolution. |
| Task procedures | Rules and linked skills | Conditional routing exists. A skill description should select a procedure before its full supporting material is opened. |
| Module availability | `agentsBlock()` in `src/platform/core/modules/pack.ts`, CLI synchronization | Enabled modules contribute task conditions, rather than all their instruction contents. Manual configuration changes require sync; a build does not sync. |
| Diagnostic map | `src/modules/systems/content/map.ts`, `content/node/instructions.js` | Inventories routes and missing links. It is neither a semantic task resolver nor a trace of what was read. |
| Verification | Boundary checks, tests, build, rendered inspection | Enforces selected technical properties. Does not establish instruction selection or quality of the resulting experience. |

The current generated map reports two always-read Studio rules, nine on-demand rules, one rule reached through another rule, five skills, and no missing or unrouted rules. That is structural evidence, not proof of successful task routing. Product currently has no product knowledge beyond its entry point; Marketing routes Brand, Library, and Marketing Design.

There is no checked-in `.agents/skills` adapter registering these system skills as native Codex skills. A procedure can still be read through root and system links. Do not assume a `src/systems/<id>/skills/` folder is automatically in a host's skill catalog.

## Offline measurements

Run from the repository root:

```sh
node src/platform/node/eval/context/inventory.js > /tmp/studio-context-inventory.json
```

The script only reads repository files and Git revision. It does not call a model, mutate files, parse credentials, or infer a routing closure. Profiles deliberately list selected files; linked conditional material, implementation files, and host context are excluded.

At the audited revision:

| Selected file set | UTF-8 bytes | Meaning |
| --- | ---: | --- |
| Root instructions plus both baseline rules | 7,587 | Always required by repository policy. |
| Baseline plus Studio entry, Principles, Personas | 20,468 | Orientation required for Studio work; other conditional reads add to it. |
| Baseline plus prototype and system contracts, Systems rule, Product entry | 37,161 | Illustrative runtime task loading whole contracts, before source/API/task references. |
| Baseline plus Marketing entry, Brand, Library, Marketing Design | 13,223 | Selected system knowledge, before runtime contracts and implementation. |
| System contract alone | 18,667 | Includes themes, navigation, component docs, source editing, assignment, and routing. Many small tasks need only some sections. |

Bytes and whitespace word counts are reproducible source-size indicators. They are not tokenizer counts, live input usage, or context-window occupancy. A route can read excerpts, repeat a read, truncate output, or load extra material. The actual model and trace must establish those costs.

## Opportunities to test

1. **Bound contract retrieval.** Use headings to locate authoritative sections, then read the needed sections completely. Expand when a dependency, cross-reference, or ambiguity requires it. Keep one definition in the owning contract. Never cut requirements merely to meet an arbitrary excerpt size.
2. **Avoid repeated reads.** Reuse instruction content already read in the current conversation when unchanged. Re-read implementation files before edits as the workflow requires. After compaction or a file change, missing or stale instructions need retrieval again.
3. **Separate startup policy from task detail.** A later candidate could keep scope, system resolution, preservation, and verification in a small baseline, while moving prototype-specific creation steps and full Studio audience context behind task conditions. This changes current policy and needs quality evidence before adoption.
4. **Make discovery compact and explicit.** A potential resolver could return resolved system, rebuild target, enabled capabilities, applicable entry paths, and skill descriptions. It should return paths and reasons, not a full transitive bundle. Metadata resolution can be deterministic; deciding semantic relevance remains an agent task. The current map is not this resolver.
5. **Control tool-output volume.** Target searches, inspect matching sections, and retain full logs on disk while returning relevant diagnostics. Measure output from builds, inventories, DOM snapshots, and source reads. Less documentation can still result in more discovery calls or repairs.
6. **Preserve the critical path.** Never optimize away correct contributor scope, explicit None, rebuild preservation, unavailable modules, dependency boundaries, or required verification. These are hard outcome gates.

Do not initially add embeddings, a vector database, automatic bulk injection, or duplicate summary contracts. The current repository is small enough to evaluate explicit paths and section retrieval first. Summaries can become stale; duplicated requirements would undermine the ownership model we just established.

## Host behavior and limits

Codex discovers project instructions along the path from repository root to its working directory at startup. Nested system entry points are therefore not automatically selected simply because a prototype uses that system. Keep explicit assignment routing. The documented default project-instruction limit is 32 KiB; it applies to automatically discovered project instruction files, not the complete task context or linked files read later. [Official instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

Native Codex skills use progressive disclosure: discovery exposes metadata, and an applicable skill loads its procedure. That is a useful model for Studio routing, but it does not establish native discovery of Studio's current skill folders. [Official skills documentation](https://learn.chatgpt.com/docs/build-skills).

Prompt caching can reduce repeated input processing cost and latency. It does not remove that content from the prompt or create extra context-window capacity. Track cached and total input separately; do not label cache hits as context reduction. [Official prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).

Installed CLI inspected: `codex-cli 0.151.0`. Its help exposes JSONL output, explicit sandbox selection, ephemeral runs, model selection, and ignoring user config. `--ignore-user-config` alone is not proof that global instructions, skills, plugins, or other host context have been removed. Record and hold them constant. CLI results need a follow-up in the actual desktop environment before claiming equivalent performance there.

## Comparison design

Use the cases in [cases.json](cases.json). These are fixture specifications, prompts, and outcome rubrics, not self-scoring results. Create the fixtures in isolated copies of a pinned repository revision; do not run mutation cases in the user's active checkout. Keep the evaluator's rubric outside the agent's readable workspace and pass only the task prompt.

| Variant | Change | What it isolates |
| --- | --- | --- |
| A: baseline | Current repository instructions and ordinary retrieval | Existing cost and quality. |
| B: precise retrieval | Same required documents and rules; an experimental instruction asks for heading discovery, relevant complete sections, deduplication, and bounded tool output | Retrieval efficiency without changing operating requirements. |
| C: conditional baseline, later | Explicit instruction-file patch makes some startup context task-dependent while retaining essential invariants | Whether reduced startup material preserves outcomes. Test only after B. |

For B, use this experimental instruction in its isolated root instructions:

> Follow all current read requirements. Reuse unchanged instructions already read in this conversation. For large contracts, inspect headings, read the complete sections needed for this task, and follow relevant cross-references; expand your reads whenever scope or requirements are unclear. Use targeted searches and bounded tool output, keeping complete diagnostic logs available on disk. Do not omit requirements or verification to reduce context.

This is a hypothesis, not a production rule. B still reads the currently mandatory baseline, Studio Principles, and Personas when applicable. C must explicitly change their routing in its isolated instruction patch; a task prompt cannot silently override current repository policy.

1. Pin revision, fixture hashes, model, reasoning effort, CLI version, permissions, tools, dependency versions, and contributor identity. All runs start from the repository root. Use a dedicated registered evaluation contributor. Install dependencies before timing, with the same environment for both variants.
2. Pilot three cases: None styling, Marketing dialog, and platform copy. Run A and B once each to validate fixtures and telemetry. Inspect complete traces before tuning prompts.
3. Use eight tuning cases and four held-out cases. Run each A/B pair three times in fresh sessions: 72 runs in total. Randomize A/B order and report failures rather than dropping them. Never tune on held-out results. This is an engineering screen, not enough data to prove statistical equivalence.
4. Record infrastructure failures separately from agent failures. Missing auth, dependencies, a required tool, or a broken fixture invalidates the comparison; keep the record and rerun the pair after fixing its environment. Give every run the same time cap. Timeouts and incomplete outputs count as failures.
5. Grade the resulting diff, artifacts, checks, and behavior. Verify system resolution and required reads against traces. An agent's final list of reads is supporting evidence, not the sole measure. A correct result produced by skipping required reads fails the policy gate.
6. Then run paired multi-turn cases, including a system switch and an externally edited file. Measure whether additional reads, compaction, or repairs erase the first-turn saving. A Codex session restored through CLI can supplement, but cannot replace, a desktop continuation test.

## Capture a run

The installed CLI supports this template. `trial`, `model`, and `effort` below must be concrete recorded values supplied by the evaluator, and `prompt.txt` must contain only the chosen case's task. Do not substitute an unverified model name.

```sh
codex exec --json --ephemeral --sandbox workspace-write \
  --cd "$trial" --model "$model" \
  -c "model_reasoning_effort=$effort" \
  -o /tmp/studio-eval-final.txt - \
  < /tmp/studio-eval-prompt.txt \
  > /tmp/studio-eval-events.jsonl 2> /tmp/studio-eval-stderr.log
```

Use unique output paths per run. Time the process externally, capture its exit code, then preserve the resulting diff and run independent checks. Use read-only mode for inspection cases. Keep the host's existing permission protections and restrict the trial environment's external side effects. Repository hooks and commit requirements remain part of the baseline; no trial may push or publish.

The official JSONL example reports `input_tokens`, `cached_input_tokens`, `output_tokens`, and `reasoning_output_tokens` in `turn.completed.usage`. Record the exact emitted schema for the pinned CLI; missing fields are unavailable, not zero. Retain errors and incomplete runs. [Official non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode).

Record these measurements per case, variant, and repetition:

| Measurement | Interpretation |
| --- | --- |
| Total reported input and cached input | Model usage for the run; includes more than Studio documentation. Compare total input and uncached input separately. Do not treat input totals as peak context occupancy. |
| Output and reasoning usage | Cost of solving and explaining; do not add reasoning a second time when already included in output by the emitted schema. |
| Documentation bytes returned, unique source paths, repeated reads | Trace-based attribution. Inspect command outputs and actual excerpts; path mentions alone do not prove reading. Count returned bodies, not shell command length. |
| Other tool-output bytes and completed tool calls | Discovery and diagnostic overhead, including repeat builds. Deduplicate started/completed events by item ID. Record truncation. |
| Time to first edit and completion time | Latency, using evaluator timestamps. A successful completion requires outcome gates, not just an exited process. |
| Repairs, unnecessary questions, unexpected edits | Whether reduced context shifted effort to recovery or the user. |
| Peak active context and compaction | Only if the host exposes these reliably. JSONL aggregate usage alone is insufficient; otherwise mark unavailable. |
| Quality gates and blind review | Required behavior, scope, instruction adherence, and usability. Builds alone do not measure these. |

Hold host instructions, plugins, and tools constant for A/B. Use a separate recorded comparison later if optimizing host overhead. Repeated preambles are processing cost as well as context; a larger cached input can be cheaper but still harder to fit or reason over.

## Outcome gates and decision

All critical gates in each case must pass: correct assignment and rebuild target; correct scope; preserved originals and user edits; supported dependencies and styling; disabled-module behavior; no unrelated system material used as product direction. Mutation cases must pass the required build and relevant behavior checks. Human reviewers should not know the variant when assessing clarity and usability.

Suggested pilot adoption thresholds: no critical failures, no loss against baseline on per-case completion and required behavior, at least 25% lower median reported total input, and no more than 10% worse median completion time. Report tail latency and each case, not only pooled averages. These are proposed decision thresholds, not measured improvements or guarantees. If the baseline fails a gate, fix the demonstrated problem and rerun both variants.

Inspect regressions before adopting any change. Keep a few holdout prompts for subsequent instruction updates. Expand repetitions when results are mixed. A saving limited to trivial tasks does not establish reliable operation for system migration or module changes.

OpenAI recommends evaluating activation, resulting artifacts, command behavior, token usage, and build outcomes together. Its older article uses `--full-auto`; the current CLI documentation recommends explicit sandbox flags, as used here. [Official skill-evaluation guidance](https://developers.openai.com/blog/eval-skills).

## What has and has not been established

Established: file sizes, declared routing structure, inspected implementation, available local CLI flags, and a repeatable comparison design. Source-size measurements run without model calls.

The [six-run pilot](pilot-results.md) records live processing usage, timing, captured shell output, task-essential reads, and independent artifact checks. B captured less shell output but did not meet the total-input saving target. Browser and permission limitations left every run incomplete for the end-to-end gate. Peak-window reduction, stable latency improvement, and equivalent agent operation remain unestablished. C has not been tested. The user declined further trials and authorized conservative maintenance described in the [follow-up](pilot-results.md#authorized-follow-up). Mandatory startup context remains required; the full B candidate was not adopted.
