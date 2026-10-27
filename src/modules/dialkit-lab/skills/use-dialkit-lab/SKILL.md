---
name: use-dialkit-lab
description: Test the experimental prototype inspector with bespoke DialKit controls while DialKit Lab is enabled.
---

Read the module's [README](../../README.md) and the repository prototype skill. Keep this experiment in its own worktree. It is not a production integration procedure.

Use `@module/dialkit-lab` for `useBespokeControls` and `DialConfig`. Define controls and bind values in the prototype being refined. Do not infer control schemas from arbitrary DOM or automatically change shared theme tokens.

Inspect the real iframe and its outer inspector. Exercise a value edit, a prototype interaction, an action, reset, navigation to another artifact, source mode, Fast Refresh, floating-panel dragging, keyboard dismissal, and color mode. Measure the iframe before and after opening/collapsing; its width must stay constant. Verify constrained windows and reset temporary viewport overrides. Confirm the inspector follows the active artifact and leaves inert embeds alone. Record supported behavior separately from untested DialKit APIs.

Copy a proposal for a normal agent-assisted source change. Source saving still uses ordinary ownership and version-conflict protection. Freeze or remove the retained prototype's instrumentation before disabling or removing this module.
