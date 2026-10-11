# Agent context pilot results

Run on 2026-10-04 from `36442b6`. Six isolated CLI trials completed: one A/B pair each for None checkout styling, a Marketing dialog, and a platform action label. **Do not adopt variant B from this pilot.** It did not meet the proposed total-input saving threshold, and the trial agents could not complete rendered verification.

The [machine-readable results](pilot-results.json) contain exact usage, timing, fixture revisions, captured output sizes, scope checks, and independent verification. The [evaluation plan](README.md) defines the variants and quality gates. The pilot did not change production instructions or runtime behavior.

## Measured results

A uses the existing instructions. B adds heading discovery, relevant-section retrieval, reuse of unchanged instructions, and bounded tool output. Neither variant changes mandatory reads.

| Case | Variant | Total input tokens | Cached input tokens | Uncached input tokens | Output tokens | Wall time |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| None checkout | A | 382,244 | 351,872 | 30,372 | 5,020 | 193.2 s |
| None checkout | B | 504,660 | 472,576 | 32,084 | 9,196 | 319.3 s |
| Marketing dialog | A | 494,920 | 455,552 | 39,368 | 6,246 | 268.4 s |
| Marketing dialog | B | 563,196 | 518,528 | 44,668 | 3,116 | 142.2 s |
| Rename action | A | 378,619 | 325,632 | 52,987 | 964 | 74.3 s |
| Rename action | B | 348,575 | 323,968 | 24,607 | 1,159 | 71.9 s |

Uncached input is total minus cached input. Reasoning usage is recorded separately in JSON; it is not added to output usage again. These are aggregate processing counts, including host context, instruction reads, implementation, and tool results. They do not measure peak active context or document tokens alone. Cache hits do not free context-window space.

Relative to A, B used 32.0% more total input for checkout, 13.8% more for Marketing, and 7.9% less for Rename. Latency increased 65.3% for checkout, fell 47.0% for Marketing, and fell 3.2% for Rename. One observation per case cannot establish stable performance. Failed tool recovery also affects these timings.

B captured less command output in every pair:

| Case | A captured shell output | B captured shell output | Completed commands A/B |
| --- | ---: | ---: | ---: |
| None checkout | 109,093 bytes | 40,382 bytes | 7 / 13 |
| Marketing dialog | 133,748 bytes | 85,925 bytes | 10 / 13 |
| Rename action | 121,090 bytes | 46,063 bytes | 7 / 8 |

These sizes count UTF-8 `aggregated_output` bodies of completed command events, once per emitted item. They measure captured command output; JSONL does not establish the exact text the model received after tool-output truncation. They exclude command arguments, browser results, web results, and automatically supplied instructions. They include mixed document, source, diagnostic, and build output. They are not a documentation-only attribution. Across these runs, B captured 52.6% fewer shell-output bytes but issued more commands in every pair.

## Result and instruction review

All six results passed independent `pnpm build`, including 181 tests per run, typecheck, boundary checks, and the production build. Independent builds occurred after the measured trials. Agent builds also passed in the captured traces. Scope review included untracked files; Marketing A's new CSS Module was uncommitted and would be missed by `git diff` alone.

| Case | Result inspection | Routing evidence |
| --- | --- | --- |
| None checkout A/B | Local CSS Modules and React components; editable contact/address fields; express shipping updates the total; local confirmation explicitly places no order. | Both resolver commands returned `eval`; both read metadata and preserved explicit `system: null`. Neither imported a system runtime. |
| Marketing dialog A/B | Marketing Button, local dialog composition, themed portal; empty and invalid input rejected; valid input reaches success; Escape closes and returns focus; keyboard focus wraps inside the dialog; light and dark surfaces work. | Both resolved `eval`, read Marketing entry, Brand, Library, Marketing Design, platform rules, and the relevant contracts. Both preserved Marketing assignment and avoided Studio/Product runtime imports. |
| Rename action A/B | Exactly one source line changes the idle confirmation label from Save to Rename. Visible dialog action and Cancel behavior were checked. Submission behavior was not exercised; unchanged handlers were verified by the diff. | Both read the Studio entry, Principles, Personas, UI Copy, baseline rules, and relevant Systems material. Neither used unrelated product guidance. |

These behavior checks used the evaluator's desktop browser outside the timed runs. They do not substitute for the agent's required rendered check. This was an unblinded functional review, not a blind comparative design assessment or exhaustive accessibility audit.

The task-essential required reads were verified against actual command output, not the agents' final claims. The root instructions were supplied through CLI project discovery. No missing task-essential read was found in this small sample. B's retrieval was not consistently narrow: Marketing B read most of the System contract, while Rename B also opened a documentation skill and asset guidance for a label-only task. The additional retrieval instruction can itself prompt extra discovery.

All measured processes exited successfully without a timeout. That does not mean all operating gates passed. Three runs left their requested work uncommitted: both Marketing runs and Rename B. Marketing B attempted a commit and encountered restricted Git writes; Marketing A and Rename B did not complete a commit. All reported that rendered verification was blocked. No remotes were configured, and no push or publication occurred.

## Harness limitations

The user explicitly authorized the live trials and transmission to OpenAI. The first post-authorization launch with the Homebrew CLI `0.151.0` rejected `gpt-6.1-sol` before inference. A trivial fallback probe also failed. The desktop-bundled CLI `0.160.0` accepted the configured model. All six measured runs therefore used that binary, `gpt-6.1-sol`, and medium reasoning. The failed launch is preserved separately and excluded from the measured variant results.

The CLI sessions exposed Computer Use tools but no usable browser. Attempts to select IAB or Chrome failed; native Brave access was not approved. Several local dev-server attempts also failed under the workspace sandbox. We did not bypass those protections. Browser discovery and unsuccessful recovery added differing overhead to each run. **Every run is incomplete for the end-to-end adoption gate.**

The evaluator could start local servers and inspect the results in the desktop IAB. Its preview identity differed from the CLI's registered `eval` identity. The Rename dialog was therefore inspected on an existing Patrick-owned prototype in the isolated clone, using Cancel only. This establishes the shared label's rendering, not equivalent contributor resolution across the two environments. A later harness must verify that identity before timing.

All trials used independent dependency copies, pinned pnpm `11.28.3`, and `verifyDepsBeforeRun: false` to prevent relocation-triggered reinstall. These are trial preparation differences, not production changes. The six runs shared the host's existing instruction, skill, and tool configuration; they were not stripped-down model requests. Evaluator browser work overlapped later trials, so measured wall times also include ordinary shared-machine conditions.

Peak-window usage, compaction boundaries, and exact documentation-token attribution remain unavailable from this JSONL capture. Raw events, timestamped events, final messages, diffs, checks, and screenshots are preserved locally under `/tmp/studio-context-pilot-veXt91/results/`. The fixtures and plan are in the parent directory. Temporary evidence is not a durable published archive; the compact results and this interpretation are committed here.

## Next experiment

1. Establish a usable browser and prestarted local preview before timing. Confirm the browser is connected to each trial session, the preview contributor is `eval`, server ownership matches the fixture, and permitted Git writes work. If the CLI cannot provide this, use desktop-backed isolated sessions. Do not count a tool's presence as proof that it works.
2. Keep the existing production routing. Test bounded diagnostic output as its own candidate, then section retrieval separately. This pilot combined them, so it cannot establish which produced a saving or regression.
3. Repeat paired runs in fresh sessions with randomized order. Include the other tuning cases and preserve the held-out cases from the evaluation plan. Separate agent verification from independent evaluator checks and keep failures visible.
4. Only after that, test conditional startup context. Keep contributor scope, explicit None/default/named/rebuild resolution, dependency boundaries, preservation, and verification immediately available. Do not replace contracts with duplicated summaries.
5. Verify any successful candidate in desktop multi-turn work. Measure retrieval after changed files and compaction, rather than assuming first-turn savings persist.

The useful signal here is smaller captured command output, especially retained build logs. Exact model-visible output still needs instrumentation. The pilot does not establish reduced context-window occupancy, equivalent end-to-end operation, or a reason to relax current startup requirements.

## Authorized follow-up

After reviewing the results, the user declined further trials and authorized targeted maintenance. Root instructions now route Studio context through one entry point, reuse unchanged instruction text while it remains available, and retain verbose check logs locally. The Manual and routing contract describe these agent practices. Mandatory context, assignment resolution, source refresh before edits, and verification remain required. The complete B candidate was not adopted. No further live comparison or quantified performance improvement is claimed.
