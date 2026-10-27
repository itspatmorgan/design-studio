---
name: use-dialkit-lab
description: Add, tune, save or remove bespoke DialKit controls on prototype views while the module is enabled.
---

Read the module's [contract](../../README.md) and the prototype build skill. Resolve the view's ownership and explicit system assignment before editing it. This capability supports prototype views; system component editing and timeline UI are separate work.

Use the existing Add DialKit menu action to scaffold a workspace. Describe controls in the prototype through `@module/dialkit-lab`, with literal unique group names and explicit value bindings. Keep native controls/folders native. Ask for missing design intent in chat; do not add a brief form or modal. Keep shared components and tokens unchanged unless separately requested.

Use Save to retain accepted defaults and the View menu's Remove DialKit to capture current values and detach. Both use `node/source.ts` for source preparation and ordinary authorized, version-checked source writes. An interrupted preview, source conflict, unsupported binding or group mismatch must be resolved rather than bypassed. Empty Add is idempotent. Add after removal starts a fresh workspace around the preserved design.

Before disabling or removing the module, detach public-library consumers. Use managed module commands and their dependency checks; do not force removal or substitute no-op hooks. Preserve prototype identity, assignments, assets and rendering.

Inspect the iframe and inspector after changes. Exercise tuning, a prototype action, Save/reload, removal, and reattachment. Opening and hiding must preserve preview width. Check theme boundaries, native popovers, scrolling, keyboard dismissal and constrained windows relevant to the change. Distinguish actual browser evidence from source/build checks and unsupported surfaces.
