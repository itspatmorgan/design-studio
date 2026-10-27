# DialKit Lab

An isolated workflow experiment for prototype-local tuning through an outer Studio inspector. This module is available only on the experimental branch. It does not establish a supported platform integration API.

## Runtime and inspector

`lib/index.tsx` exposes `useBespokeControls(name, config, { onAction }?)` through `@module/dialkit-lab`. The config and its value bindings stay beside the prototype. The experimental adapter supports the simple slider, color, toggle, and action controls exercised by the booking fixture. Other DialKit controls, presets, and timelines are unqualified.

`app.tsx` contributes a lazy inspector through the experimental `ModuleApp.previewInspector` slot. Its UI and CSS live in the application layer, outside the runtime library. The contribution needs local development and `VITE_DIALKIT_EXPERIMENT=true`. Desktop uses a docked, collapsible panel with adjustable width. At 800px and below it becomes an overlay so the preview remains usable when the panel is collapsed. Docked width changes the preview's actual responsive viewport.

The module's `studio-dialkit-lab` version-1 channel carries bounded configuration/value snapshots and value, reset, and action commands. Sender window, origin, session, runtime, artifact identity, panel instance, and message ordering constrain delivery. This is trusted same-origin code, not a security sandbox. Commands never read or write source files.

Each prototype hook retains its local store across Fast Refresh. Actual unmount releases the store. Host mirrors are disposed on screen departure and source mode. Source mode pauses the inspector; returning requests the retained preview's current values. Inert embeds do not register with the host. Plain page reloads reset tuning. No browser persistence is enabled.

Copy proposal includes active artifact identity and named configurations/values for agent-assisted source edits. There is no Apply-to-source action. DialKit's built-in copied parameters and version UI describe the host mirrors; they do not provide iframe-aware thumbnail capture or a complete production handoff.

## Boundaries and reproduction

The module uses only public Studio types. The preview host enumerates enabled module contributions and imports no DialKit implementation. It is not necessary to turn this module into a required dependency.

The retained prototype imports this module's public library, so remove or replace its instrumentation before disabling/removing the module. The editor and bridge are excluded from production, but the prototype's DialKit value hooks remain runtime dependencies with source-config defaults. Hiding the inspector is not dependency removal.

Use the [investigation record](../../../experiments/dialkit/README.md) for the fixture, startup commands, evidence, limitations, and cleanup. [Use DialKit Lab](skills/use-dialkit-lab/SKILL.md) describes agent operation. The [module contract](../../platform/context/modules.md) owns installation and boundaries.
