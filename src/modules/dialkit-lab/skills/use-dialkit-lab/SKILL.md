---
name: use-dialkit-lab
description: Test the experimental prototype inspector with bespoke DialKit controls while DialKit Lab is enabled.
---

Read the module's [README](../../README.md) and the repository prototype skill. Keep this experiment in its own worktree. It is not a production integration procedure.

Use `@module/dialkit-lab` for `useBespokeControls` and `DialConfig`. Define controls and bind values in the prototype being refined. Do not infer control schemas from arbitrary DOM or automatically change shared theme tokens.

Inspect the real iframe and its outer inspector. Exercise a value edit, a prototype interaction, an action, reset, navigation to another artifact, source mode, Fast Refresh, floating-panel dragging, keyboard dismissal, and color mode. Measure the iframe before and after opening/collapsing; its width must stay constant. Verify constrained windows and reset temporary viewport overrides. Confirm the inspector follows the active artifact and leaves inert embeds alone. Record supported behavior separately from untested DialKit APIs.

When asked to retain tuned values, make a normal agent-assisted source change. The live panel no longer includes a Copy to agent handoff. Source saving still uses ordinary ownership and version-conflict protection. Freeze or remove the retained prototype's instrumentation before disabling or removing this module.

The View context menu toggles Add DialKit and Remove DialKit for the current view. Add directly creates one empty workspace with a leading `// @dialkit-lab {"version":1}` declaration and opens it without a dialog. The empty state nudges the person to ask the agent in chat for desired controls. There is no separate brief field. Preserve the workspace declaration while adding actual named dials through the public hook. Empty removal is available from the view menu, not a trash button in the panel. Connected hook removal still needs source acceptance and binding cleanup. Do not represent hiding as removing instrumentation.
