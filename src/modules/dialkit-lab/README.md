# DialKit Lab

An isolated workflow experiment for prototype-local tuning through an outer Studio inspector. This module is available only on the experimental branch. It does not establish a supported platform integration API.

## Runtime and inspector

`lib/index.tsx` exposes `useBespokeControls(name, config, { onAction }?)` through `@module/dialkit-lab`. The config and its value bindings stay beside the prototype. The experimental adapter supports the simple slider, color, toggle, and action controls exercised by the booking fixture. Other DialKit controls, presets, and timelines are unqualified.

`app.tsx` contributes a lazy inspector through the experimental `ModuleApp.previewInspector` slot. Its UI and CSS live in the application layer, outside the runtime library. The contribution needs local development and `VITE_DIALKIT_EXPERIMENT=true`. A floating DialKit chip opens a nonmodal overlay at the preview’s top-right. Neither state reserves layout space or changes the iframe viewport. Drag the header or use the grip’s arrow keys to reposition it; Home restores its corner position. Movement is clamped to the workspace. Escape collapses the panel and returns focus to the chip; native popovers handle Escape first. Controls stay mounted while collapsed, with the hidden dialog inert. Opening uses a 220ms ease-out scale/fade, closing takes 140ms, and the shell respects reduced motion. The panel fits its content up to the preview height minus matching edge insets and the chip/gap. Reset lives in the header; there is no footer. The panel has one control scroll area within the available height. Section titles and version rows scroll with their controls rather than pinning over them; sections remain independently collapsible. The draggable header shows only the sliders icon and DialKit.

The module's `studio-dialkit-lab` version-1 channel carries bounded configuration/value snapshots and value, reset, and action commands. Sender window, origin, session, runtime, artifact identity, panel instance, and message ordering constrain delivery. This is trusted same-origin code, not a security sandbox. Commands never read or write source files.

The prototype actions menu offers Hide/Show DialKit for the active view when it has registered controls. Hiding removes the shell and trigger while retaining hook values and host mirrors. Visibility is keyed to artifact identity in memory for this browser session; reloading resets the preference. This experimental action uses the existing module contribution API.

Each prototype hook retains its local store across Fast Refresh. Actual unmount releases the store. Host mirrors are disposed on screen departure and source mode. Source mode pauses the inspector; returning requests the retained preview's current values. Inert embeds do not register with the host. Plain page reloads reset tuning. No browser persistence is enabled.

The proposed Copy to agent action and raw-values disclosure were removed from the live panel. Tuning is still transient: saving accepted values into prototype source remains an ordinary agent-assisted code change. There is no Apply-to-source action. DialKit's built-in copied parameters and version UI describe the host mirrors; they do not provide iframe-aware thumbnail capture or a complete production handoff.

## Boundaries and reproduction

The module uses only public Studio types. The preview host enumerates enabled module contributions and imports no DialKit implementation. It is not necessary to turn this module into a required dependency.

Instrumented prototypes import this module’s public library, so remove or replace that instrumentation before disabling/removing the module. The booking lifecycle fixture has now had its instrumentation removed, with accepted values retained as ordinary source constants. The editor and bridge are excluded from production, but the prototype's DialKit value hooks remain runtime dependencies with source-config defaults. Hiding the inspector is not dependency removal.

Use the [investigation record](../../../experiments/dialkit/README.md) for the fixture, startup commands, evidence, limitations, and cleanup. [Use DialKit Lab](skills/use-dialkit-lab/SKILL.md) describes agent operation. The [module contract](../../platform/context/modules.md) owns installation and boundaries.
