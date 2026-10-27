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

The smallest next experiment should exercise a bespoke prototype composition in its real iframe, with multiple independently named control groups and an animation. Compare local floating controls against a shell inspector. Verify navigation, source mode, HMR, responsive resizing, light/dark, state lifetime, stale messages, inert embeds, and publishing before selecting the shared API. The second experiment below introduces a provisional contribution slot and a separate bounded bridge to test this direction.

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


## Right-side inspector experiment

The working demo is [DialKit Booking Lab](http://127.0.0.1:5175/prototypes/6rqq59jnk56hm9x0/artifacts/q8rr3bhdrwxhcntr). It is a fictional, two-screen booking flow with real selection, navigation, and confirmation interactions. Its explicit assignment is `systemId: null`. The main screen defines Weekend layout and Confirmation motion controls; the story screen defines Story typography controls. These configurations live with the prototypes rather than in a component/property registry.

The `dialkit-lab` module exposes an experimental runtime hook and contributes the right-side inspector through a provisional generic `ModuleApp.previewInspector` field. Prototype hooks and host mirrors have separate DialStores connected by validated, ordered messages. The slot and protocol remain experiment code for review, not a production API decision. See [module contract](../../src/modules/dialkit-lab/README.md).

### Reproduce the prototype

Your existing local contributor content remains ignored by Git. A portable fixture is saved under `experiments/dialkit/prototype/`; it contains no allocated prototype identities or contributor profile. To materialize it under the resolved contributor, run:

```sh
node experiments/dialkit/setup-prototype.mjs
VITE_DIALKIT_EXPERIMENT=true pnpm dev --host 127.0.0.1 --port 5175 --strictPort
```

The setup script uses managed creation/identification, preserves fresh identities, and leaves an already-existing prototype untouched. It prints that installation's prototype address. Prefix with `mise exec --` when using the repository toolchain.

### Findings and limits

- Outer controls updated rendered child-document typography, shape, and density. A 64px title, square cards, and 16px card padding were confirmed through DOM styles.
- Inspector actions triggered the prototype's confirmation animation. Color-picker UI opened in the inspector document and color edits were accepted.
- Main → About replaced both control groups with Story typography. Returning starts fresh tuning for that artifact. Scope includes session, child runtime, artifact identity, and a per-mount panel ID.
- Source mode removed the active inspector. Returning restored the current tuned values from the retained preview.
- Initial HMR reset tuning while preserving booking selection. The adapter now uses a per-mount stable store ID and releases it after true departure. A subsequent prototype-only source edit preserved the 64px title and selected booking, and the new copy appeared without reload.
- Collapsing the inspector expanded the iframe from 750px to 1022px in the initial desktop viewport and reopening preserved the tuning. Width adjustments crossed the prototype's 700px breakpoint. Panel dimensions currently reset between artifacts; that is a product choice to revisit.
- The first full regression run exposed an existing test that assumed every module lived under the platform root. Its expected paths now use the actual module-directory catalog, preserving coverage for both supplied and team modules.
- Tests cover sender/origin/scope validation and malformed, cyclic, oversized, unsupported, and non-finite payloads. A generic source-writing command is rejected.

This experiment qualifies only the documented simple controls. Full DialKit controller parity, nested spring/easing values, presets, timeline integration, iframe-aware thumbnail capture, production dependency removal, and an automatic source-acceptance flow remain outside this test. The current schema transports JSON configurations and values; it is not a commitment to a platform-wide schema.


### Final verification

- All 377 regression tests passed, including the two focused transport tests. Production compilation, module checks, and typechecking passed. The existing large-chunk warning remains.
- A local static preview on port 5176 rendered the prototype, accepted a demo reservation, and had no Design inspector. The runtime value hooks remain bundled, as documented above.
- A temporary host used the real Views runtime with `surface: embed`. It reached `Preview: ready`, its child root was inert, and its tuning-message registration count stayed at zero. The temporary host was removed after inspection.
- The inspector and prototype were inspected in light and dark. At a 420px browser width, an overlay preserved the preview viewport. Collapsing reserves a slim strip instead of covering the prototype's right edge. The browser viewport override was reset after testing.
- Reset synchronized the host and child back to defaults. Copy proposal displayed its success state. Returning from source mode retained a 64px title. Visiting About replaced the main controls; returning to Main reset to its 44px source default.
- Editing the implementation of the tuning hook itself can require a full reload when its hook signature changes. This is separate from the verified ordinary prototype-only Fast Refresh path.

Recommendation: continue with a contextual inspector that hosts prototype-authored controls. Validate the production handoff and more of DialKit's API before treating the experimental slot/transport as a supported integration. Prefer explicit preview width controls or an overlay option when designers need to hold a target viewport constant while tuning.


## Floating DialKit iteration

The dock has been replaced with a compact sliders-icon DialKit chip and a floating, nonmodal panel. Both are absolutely positioned within the preview host; neither consumes a flex column. The collapsed state is the default. The panel keeps native DialKit controls, scoped tuning, reset, and Copy to agent. Its draggable header and keyboard grip allow moving controls away from the area being refined. There is no reserved right strip or width handle.

The shell uses restrained 220ms opening and 140ms closing scale/fade transitions from the top-right corner, a reversible Motion animation on the same mounted panel, subtle press feedback, layered shadows, and reduced-motion branches. Hidden controls are inert; Escape returns focus to the chip. Native color-picker dismissal takes priority over the shell. The overlay intentionally covers part of the prototype while expanded; collapsing restores unobstructed access without changing responsive breakpoints.

Verified in the live booking prototype:

- At a 1118px browser viewport, the iframe remained **1070px open and closed**. At 420px, it remained **372px open and closed**. The temporary viewport override was reset.
- A keyboard slider edit from 44 to 45 persisted after Escape collapse and reopening.
- Dragging moved the panel from its corner; Home on the grip restored its position. Narrow-window resizing kept it within the workspace.
- Escape dismissed the native color picker first, leaving the panel open. A subsequent shell Escape restored chip focus.
- Scrolling reaches all controls and the footer stays accessible. Reduced-motion branches were inspected in source; the browser tool does not expose preference emulation, so that preference was not visually emulated.

All 377 regression tests passed again, and the production build, typecheck, and module checks passed. The existing large-chunk warning remains.

The earlier dock-width measurements above are historical findings superseded by this iteration. Integration remains experimental and local to this worktree.


### Natural scrolling and header cleanup

Follow-up feedback removed the proposed Copy to agent handoff and raw-value disclosure from the shell. Live tuning remains transient; removing this action does not add source persistence. Reset remains available. The header now contains only the sliders icon and DialKit, with no native grab-handle tooltip or hover fill/shadow. Keyboard movement instructions remain available to assistive technology.

The native section headers and version toolbars now scroll in normal document flow within the panel's single controls scrollport. They no longer pin over sliders. Both groups were expanded, scrolled, and independently collapsed/reopened in the booking prototype. Computed section-header positioning is relative rather than sticky, and scrolling moves both headers by the same offset. The production build, typecheck, and module checks pass, with the existing chunk-size warning.
