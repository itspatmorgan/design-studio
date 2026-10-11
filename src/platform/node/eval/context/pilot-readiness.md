# Six-trial pilot readiness

Prepared on 2026-10-04 from `36442b6`. The user authorized transmission and all six CLI trials subsequently ran. See [Pilot results](pilot-results.md) for measured outcomes and harness limitations. The initial approval block and model compatibility failures were infrastructure conditions, not variant results.

## Prepared comparison

Three cases, with one fresh A/B run each: None checkout styling, Marketing request-demo dialog, and prototype Rename action copy. Order is None A/B, Marketing B/A, then copy A/B. This counterbalances pair order but is not a randomized or statistically conclusive sample.

All six trials use separate local Git clones, no Git remote, a registered `eval` contributor, and the same committed fixtures. Each contains an explicit None checkout, a simple Marketing launch page, and a seeded `Save` label in the existing Rename dialog. Evaluation rubrics and the investigation folder were removed from the trial workspaces before fixture commits. Only the case prompt is passed to the model.

Variant B adds the experimental retrieval instruction from the evaluation plan to its root instructions. Variant A does not. All required reads and verification rules remain in force. Shared trial instructions identify the isolated environment, scope authorization, contributor identity, and a unique local dev-server port, and prohibit pushing, publishing, or dependency changes. Repository hooks are copied and enabled in both variants.

The host model configuration inspected for this pilot is `gpt-6.1-sol` with medium reasoning. The initially inspected Homebrew CLI was `0.151.0`; measured runs used the desktop-bundled `0.160.0` after the older CLI rejected the configured model. The runner uses workspace-write sandboxing, ephemeral sessions, JSONL events, timestamped copies of those events, a final-message file, and a 900-second cap per run. It records exit status, timeout, elapsed time, and exact fixture revision. Exact usage and completion data are recorded in [pilot-results.json](pilot-results.json). Agent browser access failed; independent evaluator checks are recorded separately.

## Dependency preparation

Dependencies are independent filesystem copies of the active workspace's installed packages. A symlinked top-level dependency directory was rejected by pnpm. Copying dependencies then exposed pnpm's automatic dependency verification, which attempted a reinstall because the checkout and store had moved. These preparation failures occurred before model calls and outside measured run times.

For all six trials, pnpm is pinned to the installed `11.28.3` executable and the trial workspace configuration sets `verifyDepsBeforeRun: false`. This suppresses relocation-triggered automatic reinstall, not the repository's checks, tests, typecheck, or build. No production configuration or dependency file was changed. This pilot environment differs from the desktop's default pnpm invocation; it must be recorded when interpreting or reproducing results.

The None A fixture passed `pnpm build`: all 181 tests, typecheck, boundary checks, and production build. Local checks confirmed the six trials resolve contributor `eval`, preserve explicit `system: null` for checkout, assign launch to Marketing while Product remains the default, and have no remotes. All six results subsequently passed independent post-task builds and scope review; see the results report for the limits of UI verification.

## Local artifacts and next step

Temporary artifacts are at `/tmp/studio-context-pilot-veXt91/`. `plan.json` records prompts, case order, fixture revisions, model, reasoning, dependency executable, ports, and timeout. Each trial directory contains its exact starting checkout. `preflight-build.log` records the successful fixture build. The launch runner and fixture preparation scripts are at `/tmp/run-context-trial.mjs` and `/tmp/prepare-context-pilot.mjs`.

At the end of the pilot, production instructions and runtime files were unchanged. The six trials ran sequentially; their traces, diffs, and independent checks are preserved in that directory. See the [authorized follow-up](pilot-results.md#authorized-follow-up) for subsequent targeted instruction maintenance. A future measured comparison would first need to repair the demonstrated harness gaps. Do not adopt the full candidate based on a single pair or a lower token count alone.
