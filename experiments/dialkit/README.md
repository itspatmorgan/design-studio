# DialKit investigation

Issue: https://github.com/itspatmorgan/design-studio/issues/6

Isolated branch: `codex/dialkit-test`. This branch is an experiment, not a proposed production integration. It shares no dependency installation, server port, or source edits with the InFlight experiment. The existing Studio checkout remains unchanged.

## Product direction

Patrick clarified that DialKit should support bespoke refinement during ordinary prototyping, alongside design-system component refinement. Consider a globally available tuning capability and a sustainable Studio inspector, potentially on the right side. Do not turn the first Button compatibility demo into the integration architecture or a fixed property catalog.

Recommended working model: make tuning available across Studio, keep configurations and value bindings beside the design they affect, and show the active context's registered controls in an optional inspector. An agent can introduce controls mid-workflow, the designer tunes them, then the agent applies chosen values to the appropriate source and removes temporary instrumentation when appropriate. Shared theme changes remain a deliberate choice.

## Upstream evidence

Reviewed 2026-10-26. The installed package is DialKit 2.1.0 with Motion 14.6.0. Sources on `main` can change independently of that package.

- [Official site](https://www.dialkit.dev/) includes prompts for adding controls to existing animations, building a modal, tuning grid/card layouts, and adjusting animation timelines.
- [Photo Stack example](https://github.com/joshpuckett/dialkit/blob/main/example/src/PhotoStack.tsx) wires separate subject and stage configurations into an interactive composition: content, layout, shadows, appearance, motion, and a next-item action.
- [Release example](https://github.com/joshpuckett/dialkit/blob/main/example/src/Release.tsx) connects controls to typography and SVG filter parameters. The library is useful beyond component dimensions or theme tokens.
- [README](https://github.com/joshpuckett/dialkit#readme) describes named configurations with reactive values. Multiple panels share one root; inline and floating roots are supported. Browser versions and copying support iteration. Production root hiding hides the editor, not every hook or value consumer.
- [Reference](https://github.com/joshpuckett/dialkit/blob/main/docs/reference.md) documents controls, controllers, custom layouts, and optional persistence. A stable panel ID retains values across unmounts; browser persistence is a separate option.
- [Timeline guide](https://github.com/joshpuckett/dialkit/blob/main/docs/timeline.md) describes a separate dock with playback, scrubbing, timing, and curve editing. Copying supports handoff; sampled bindings must be replaced before removing the timeline runtime.

These are documentation/source findings. This spike has not exercised the upstream examples, timeline editor, thumbnail capture, or version comparisons in Studio.

## Platform implications

Proposed, not implemented:

1. **Optional capability with a public runtime entry.** Prototype-local hooks/configuration should be usable with any assigned system and with explicit `systemId: null`. Studio already permits enabled module runtime libraries through `@module/<id>`. A system-owned library alone would limit availability to that system. Preserve DialKit's flexible control/config/controller types instead of inventing a fixed Button or token schema.
2. **A reusable contextual inspector.** A shell contribution slot could offer a right-side tool panel in prototype and system workspaces. DialKit would be one consumer. Avoid hardcoding the shell to one tool or giving every prototype a permanent inspector. Decide sizing, collapse, narrow layouts, focus return, and responsive viewport effects through a layout test. Current `ModuleApp` has no inspector contribution API.
3. **Keep runtime state with the preview.** Prototype components execute in separate documents. The shell's DialStore and a preview's DialStore are different instances; a shell root cannot discover child registrations automatically. A supported bridge must identify the active artifact/session/document and version its configuration, values, actions, and disposal. It must ignore stale contexts and avoid connecting inert canvas/gallery/document embeds. No file-write authority belongs in this bridge. Systems examples currently run in the application document and need a different adapter to the same inspector contract.
4. **Preserve presentation flexibility.** Start by testing an inspector for parameter controls. Keep floating/inline local panels and the separate timeline dock viable; a narrow right rail may not suit timeline editing. Thumbnail capture and all-version previews need explicit iframe-aware validation before promising support.
5. **Make lifetime choices explicit.** Temporary controls can reset on departure; continuing explorations may opt into stable IDs and storage scoped to studio/prototype/artifact/experiment identities. Do not impose one discard policy globally. Browser persistence and DialKit versions are not saved repository source or Git history.
6. **Use the normal agent/source workflow for acceptance first.** Copy tuned values and their context, then let the agent apply a reviewed change to local component/layout/animation code or an intentionally selected shared token. Avoid generic regex rewriting and automatic shared-token edits. Any future Apply action must reuse permission and source-version conflict checks.
7. **Define disabled and published behavior.** A hidden editor does not remove runtime dependencies or timeline sampling. Test explicit defaults/frozen accepted values, controls excluded from inert previews, and removal of instrumentation before disabling/removing the module when retained source imports its public entry. Existing boundary checks reject unavailable imports. Do not promise that a module with live consumers can simply be deleted.

The smallest next experiment should exercise a bespoke prototype composition in its real iframe, with multiple independently named control groups and an animation. Compare local floating controls against a shell inspector. Verify navigation, source mode, HMR, responsive resizing, light/dark, state lifetime, stale messages, inert embeds, and publishing before selecting the shared API. No shell extension or bridge has been introduced by this branch.

## Initial compatibility spike

The Product Button page gains a development-only section when `VITE_DIALKIT_EXPERIMENT=true`. It uses the actual Product Base UI Button and an inline DialRoot. Height, horizontal padding, corner radius, and transition duration affect only this experiment's three preview variants. The normal component examples and shared source remain unchanged.

This deliberately narrow fixture establishes library compatibility in the Systems document. It does not establish the global prototype workflow or support arbitrary source editing.

### Verified

- Live slider keyboard edits reached all three actual rendered buttons. A 64px height and 1px radius were confirmed through computed DOM styles.
- Primary button clicks still worked and incremented the preview counter. Disabled state applied to all three variants.
- Reset restored the configured starting values.
- Studio light/dark changes updated both the Product boundary and DialKit root. Both were inspected visually.
- Copy proposal reached the success state. A readable proposal is also rendered inline; clipboard behavior across browsers is not established.
- Departing for Card removed the root. Returning reset tuning after removing the stable panel ID.
- Important discovery: `persist: false` alone does not discard in-memory state when an explicit stable `id` is supplied. The fixture now omits `id`, as appropriate for its temporary scope.
- Repository regressions: 375 passed, 0 failed.
- Production build, typecheck, and module checks passed. Emitted JS/CSS contained none of the experiment's panel, labels, or CSS markers. Vite's existing large-chunk warning remains.

### Reproduce

In this worktree, use the repository's Node 24 and pnpm 12 toolchain. Install with `pnpm install --frozen-lockfile --ignore-scripts` if necessary, then:

```sh
VITE_DIALKIT_EXPERIMENT=true pnpm dev --host 127.0.0.1 --port 5175 --strictPort
```

With mise, prefix commands with `mise exec --` after trusting this worktree's `mise.toml`.

Open http://127.0.0.1:5175/systems/4f3m7z08hk5a0k53/components/button and find Tune Button. Adjust controls, try the buttons and disabled state, reset, change color mode, and navigate to Card and back.

Run `pnpm test` and `pnpm build` for repository verification. Running without the environment flag leaves the normal component page. Production eliminates the lazy experiment import through the `import.meta.env.DEV` guard.

### Cleanup

Stop this worktree's port-5175 dev-server process. Retain the branch and its commit for review or archive this chat's managed worktree. Nothing needs to be removed from the main checkout or the InFlight environment. No remote deployment, GitHub issue edit, push, or merge was performed.
