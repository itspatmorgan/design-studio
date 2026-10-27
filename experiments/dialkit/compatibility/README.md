# DialKit 2.1.0 compatibility test

This is the historical control/native-API compatibility pass. The shipped public library no longer includes the test-only probes. Current lifecycle behavior and verification are in [the integration record](../integration.md).

This is a development-only React integration test on `codex/dialkit-test`, served on port 5175 with `VITE_DIALKIT_EXPERIMENT=true`. It compares an explicitly unassigned prototype with a Product-assigned prototype. It does not qualify system component documentation previews or automatic writes to shared tokens.

## Reproduce

Run `mise exec -- node experiments/dialkit/compatibility/setup.mjs`. It creates two managed prototypes for the resolved contributor and preserves existing folders. The no-system version uses local CSS Modules and an HTML button. The Product version imports the real Product `Button` and tunes that instance. Neither changes the shared component or theme. The original booking view also has its layout, finish and confirmation controls restored, preserving its accepted defaults.

Open Controls, then the sliders chip. Native core probes below the card exercise APIs in the iframe separately from the outer inspector. `Run controller checks` leaves a named editable version and session values; reload to inspect retention. `Reset controller and delete version` resets both persistence probes and deletes their saved versions. The localStorage probe has its own explicit button. These persistence settings belong only to the probes: ordinary floating controls remain transient.

Inventory comes from the installed `dialkit@2.1.0` declaration and implementation, checked against the upstream [reference](https://github.com/joshpuckett/dialkit/blob/main/docs/reference.md) and [timeline guide](https://github.com/joshpuckett/dialkit/blob/main/docs/timeline.md). Upstream main may change independently of the installed version.

## Control results

Each pass below was exercised through the outer panel and observed in the iframe's rendered output or live values, in **both** contexts. The native store regression also checks the renderer inventory and lifecycle.

| Control | No system | Product | Evidence |
| --- | --- | --- | --- |
| Explicit slider | Pass | Pass | Arrow/Shift/Home/End and pointer drag; rendered heading size follows. No-system keyboard test: 32 → End → Home → Shift+Right = 26. Product pointer drag reached 45. |
| Inferred number | Pass | Pass | 10 → 10.1; returned numeric value and visible status agree. |
| Toggle | Pass | Pass | Off disables the real preview button and dims the dot; reset re-enables. |
| Inferred text | Pass | Pass | Title edits update the rendered heading. |
| Explicit text | Pass | Pass | Caption edits commit and update the rendered paragraph. |
| Select | Pass | Pass | String options select Center; labelled options select Outline and affect the local button. |
| Color | Pass | Pass | Inferred hex, explicit OKLCH, alpha hex/RGB, HSL, Display P3; picker conversion/hue and opacity keyboard edits update values. CSS renders the selected values. |
| Image | Pass after fix | Pass after fix | Sage → Clay, remove → empty state, reset → Sage. Native SVG upload produces 46,858 characters and changes the iframe image. Other raster upload formats were not individually tested. |
| XY pad | Pass | Pass | Text fields return `{x:25,y:-15}`; ArrowRight + Shift+Up returns `{x:1,y:10}`; Home resets. Product pointer drag returns `{x:24,y:21}`. Positive Y maps upward in the prototype. |
| Spring / transition | Pass | Pass | Physics updates stiffness/damping/mass to 181/21/1.1; switching to Time returns visualDuration/bounce; switching to Easing changes the union discriminator. Spring values bind to a real Motion target. |
| Easing / Bézier | Pass | Pass | Duration .4 → .45; explicit coordinates and handle arrows update the curve. Keyboard handle test gives first X .17. Values drive CSS easing. |
| Action | Pass | Pass | Nested `actions.replay` invokes the iframe callback once and increments replay count. |
| Folders | Pass | Pass | `_collapsed` starts Spacing collapsed; expansion exposes nested Gap/Inset; updates keep their nested shape; metadata stays out of resolved values. |

The installed type union declares both `spring` and `transition` renderer names. The current config compiler represents authored springs and easings with the unified transition renderer. The inventory test covers all ten renderer kinds it emits, including folder and action; no extra authored control is omitted.

## Native features and shell behavior

| Feature | Result in both contexts |
| --- | --- |
| Controller | `setValue`, nested `setValues`, `getValues`, `setOpen`/`getOpen`, reset and action subscription pass through explicit probe buttons. |
| Versions | Panel New version and V1/V2 recall update iframe values. Native probe saves, renames, recalls and deletes versions. Versions are editable branches: changing an active version updates it. Source saving is separate. |
| Persistence | Explicit sessionStorage retains amount 30, nested text and renamed version after full reload. Explicit localStorage retains 9 after reload. Probe reset returns defaults and zero versions. Floating mirror persistence remains disabled. |
| Copy parameters | Native copy produces the current group's values and an agent prompt. It names `useDialKit` and uses flat nested paths; it does not understand Studio's adapter or write source. |
| Shortcuts | Native shortcut lookup/registration passes. Actual native modifier+gesture handling is **not qualified** through the floating adapter; it does not expose shortcut options. Studio's show/hide shortcut works in both contexts. |
| Timeline API | Play, pause, replay, seek, duration and loop-from-.5 work. At .5 seconds the linear entrance renders translateX(50px) and opacity .6. Step sequences and per-property tracks interpolate; grouped marker config registers. Start seek returns all targets to their initial values. |
| Timeline dock | **Not integrated/qualified.** It is a separate native UI and cannot be assumed to fit the right-side panel. It needs an app-layer integration and runtime style ownership design. No unscoped package stylesheet was added to prototype runtime. |
| View isolation | Leaving Controls for uninstrumented About removes the chip; returning registers four groups. Source mode removes the inspector and returning restores it. |
| Geometry | Iframe width measured 1,012px open, collapsed and reopened in both contexts; hide/show also leaves it unchanged. |
| Scrolling | Both preview scrollers reach their lower content (observed offsets 1,850.5px no-system and 1,929px Product). Panel has one independent control scroller; headers/version rows are not sticky. |
| Keyboard and popovers | Pad/Bézier/slider keyboard edits pass. Escape closes a color popover while keeping the panel open. Grip arrow/Home positioning and visibility shortcut pass. |
| Color mode | Outer native root switches to dark; prototype-local canvas and Product component retain their own styling boundary. Both light and dark inspected. |

## Defect fixed

The bridge's 24,000-character message cap silently discarded native image updates. The picker displayed the uploaded file while the iframe's value stayed empty. Increased the bounded whole-packet allowance to 16 MiB of serialized characters, enough for a single native 10 MiB file after base64 encoding plus metadata. Sender/origin/identity/ordering, finite-value, depth, array and key checks remain intact. The same upload reached both iframes after the fix, and regression tests cover larger image data and oversized rejection.

This is still a whole-packet limit: several large images in one group can exceed it. Large payload performance, the full 10 MiB boundary and error feedback for oversized snapshots remain unqualified. Production integration should use asset references and explicit errors rather than transporting repeated large data strings.

## Remaining qualification boundaries

- One development browser was tested. Cross-browser/mobile, touch, reduced-motion emulation and native timeline dock interactions were not tested in this run. A requested viewport override did not change the test tab's measured 1280×720 viewport, so it is not counted as a constrained-width pass.
- The public bespoke hook exposes returned values and actions; native controller options, persistent identity, shortcut gestures, custom layouts, thumbnail capture and timeline UI are not equivalent Studio capabilities yet. Native thumbnail capture in the host would capture the host rather than the prototype iframe.
- The bridge has structural limits (depth 8, arrays 64). Arbitrarily deep schemas are not qualified.
- Live edits are temporary. Saving accepted values to source and removing connected hooks remains agent-assisted. The existing UI removal guard intentionally prevents deleting live instrumentation without accepting/rebinding its values. Empty Add/Remove behavior was verified in the earlier lifecycle record, not repeated as if it removed these connected controls.
- Only the React integration and the installed Product system were tested. Other framework adapters and systems are outside this run. No shared system tokens/components were mutated.

## Verification

`pnpm test`: 386 tests pass, including native control/config/version regression and complex-payload transport coverage. `pnpm build`: passes boundaries, types, manifest and production bundle. Existing large-chunk warning remains. Browser verification used real UI interactions and read-only DOM measurements, not injected bridge messages.
