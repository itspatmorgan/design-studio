---
name: build-prototype
description: "Create or edit a Design Studio prototype view using its assigned system. Use for implementation of interactive screens and flows."
---

# Build Prototype

Inspect an existing prototype with `pnpm studio context src/prototypes/<key>/<id> --json`. Read its reported system entry and relevant guidance; the command resolves facts, not task relevance. Read the [prototype contract](../../README.md) sections needed for metadata, links, dependencies, or styles.

## Create and edit

- Create prototypes with `pnpm new "Prototype Name"`. Do not copy a whole prototype folder as a substitute for this command.
- A **Duplicate** action creates a separate exploration. If metadata has `rebuild`, read its target system guidance as well as the currently assigned system. Work only in the copy; migrate implementation and `systemId` together, verify it, then remove `rebuild`. Preserve the original. The target is a request, not the current runtime assignment.
- Write new views as `.tsx` with a default-exported React component. Keep helper files under underscore names, such as `_components/`.
- Replace the `emptyView` export when implementing an empty view.
- Use the assigned design system as a toolkit. Build local components when the experiment needs them.
- For `systemId: null`, use local components and CSS Modules; no existing system is assigned. Do not replace this explicit choice with the studio default.
- Follow that system's component APIs, token conventions, and icon library. For starter components, use Base UI's `render` prop instead of `asChild`.
- For an assigned system, use the [authoring context](../../../systems/context/authoring.md) to select contract sections for components, themes, or pop-ups.
- When changing files directly, update metadata and internal links using the prototype contract. Report incoming links for other owners to update.

## Dependencies and styles

Follow the [static asset convention](../../../../context/assets.md) when adding images, logos, fonts, or shared static files.

Follow the prototype contract's [dependency boundaries](../../README.md#dependency-boundaries). Use permitted dependencies and local styles; fix boundary errors instead of bypassing checks.

Keep experiments local until an authorized shared change moves them into the system.

After writing new prototype artifact files directly, run `pnpm studio identify src/prototypes/<key>/<prototype> --json` to preview missing identity assignments, then `--yes` to apply. Preserve existing identity metadata when editing. System context and helpers do not need artifact IDs.

## Verify and save

Inspect changed views, relevant interactions, and pop-ups in supported color modes. Repair rendering errors. Follow [working context](../../../../context/working-in-studio.md) for build, asset, commit, and sharing requirements.
