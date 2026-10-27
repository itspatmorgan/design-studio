# Prototype DialKit module integration

This record supersedes the experiment-only integration notes. Native controls and nested folders remain native. The module is prototype-focused; system component pages and timeline UI are deliberately outside this release scope.

## Architecture and engineering decisions

The existing module ID `dialkit-lab` is retained while its human label is DialKit. Studio settings, `pnpm studio enable/disable/remove`, public libraries, synchronized instructions and Manual availability use the existing conventions. There is no experiment flag. The old hardcoded Systems Button spike and the test-only public React probes were removed from shipping code.

Applied [Pstack principles](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/08-principles.md):

| Principle | Decision it changed |
| --- | --- |
| Model the Domain | Source-backed attachment is distinct from active runtime groups, visibility and saved defaults. Inactive views get the correct Add/Remove menu. |
| Boundary Discipline | Feature implementation stays in the optional module. The platform supplies generic extension points and an authorized Node-only prototype image service. Source writes reuse existing permissions, identity and revision checks. |
| Subtract Before You Add | Delete the earlier Systems spike, environment gate and test-only public exports. Clean config declarations made obsolete by Save/Remove rather than retaining broken imports or no-op hooks. |
| Make Operations Idempotent | Add preserves one declaration, source transforms tolerate repeat detachment, image retries reuse content hashes and repeated saves reuse static imports. |
| Prove It Works | Use actual UI Save/Remove and CLI lifecycle commands, production builds and observable design values rather than relying on a passing enabled build. |

## Evidence

- Native controls retain their styling and behavior inside the floating overlay. Prior per-control results are in [the compatibility record](compatibility/README.md).
- Product Controls: tune heading 32→33, Save, full reload retains 33; Remove clears the inspector and preserves the actual Product Button and 33px heading. Add produces the empty workspace around the retained design.
- No-system Controls: tune/save 33px heading, upload an SVG, persist it as a prototype-local asset, Save/reload, Remove. The image and heading remain; the ordinary prototype button still increments its replay status after detachment.
- Current booking Main: Remove preserves its 48px heading and saved card styling. Managed disable succeeds after consumers are detached. Restarted disabled Studio renders Main at 48px and Product Controls at 33px, with no DialKit chip or View action. Managed re-enable restores the capability.
- The disposable lifecycle fixture creates both no-system and Product prototypes. Disable and removal are blocked while their imports are live, without changing their source. It saves tuned values (47px, nested gap 23), detaches, disables, re-enables and physically removes the module. It runs boundary checks, type checks and production bundling in each state, compares retained metadata/source and checks removed code is absent from output.
- Asset tests reject foreign contributors, mismatched ownership, symlinks and images over 750 KB; retries produce one file. Static imports survive URL rewriting and repeated Save/Remove.
- Source tests cover typed transitions/pads, nested defaults, control metadata/actions, inactive attachment, aliases, malformed/dynamic/duplicate groups, preserved identity headers, obsolete config cleanup and action-only setter cleanup.

The tests caught and corrected three lifecycle defects: unused config declarations after detachment, identity comments duplicated while cleaning imports, and assets losing their static import after dev URL rewriting. They are represented by regressions rather than instructions to work around them.

## Availability and recovery

The module can be absent. Views importing its public library must be explicitly detached first. Shared CLI/UI settings validation and existing removal checks prevent unsupported disabling/removal; no `--force` or silent fallback is used. Dormant empty declarations can remain in source while disabled and become visible again after re-enable. Published designs use saved values and have no inspector UI.

Live tuning and native versions remain transient until Save. Hide preference is per artifact in this tab's memory. A fresh capture is acknowledged by every live group; interruption, timeout, source conflict and unsupported transformations report an error without overwriting source. Oversized/deep bridge data reports an error. Image files are ordinary retained assets; Reset does not garbage-collect them.

Source transformations support direct named public hooks with unique literal group names. Unusual binding patterns may require explicit agent edits. Cross-browser/touch behavior and native timeline/thumbnail UI are not claimed by this integration. The original experiment's constrained override did not affect its background tab. This integration subsequently tested the original browser tab at an actual 640×800 viewport: the panel stayed within the viewport and opening/collapsing kept the iframe at 372px. The original browser size and documentation view were restored.

## Checks

The release suite exercises enabled and unavailable optional modules, source/asset integrity, actor and source guards, and production output. Ordinary build warnings about existing bundle sizes remain separate from functional results. `pnpm test:release` passed 401 tests after the lifecycle fixes; final build results are reported with the implementation commit.
