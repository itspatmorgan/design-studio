# Dependency patches

Applied by pnpm on install (`patchedDependencies` in `pnpm-workspace.yaml`).

## `@excalidraw__excalidraw@0.18.1.patch`

Three changes, each applied to both `dist/dev` and `dist/prod`: hide the link icon (two conditions), and always use the desktop layout.

### Hide the link icon

**What:** two conditions:

```diff
# renderLinkIcon (paints the icon)
- if (element.link && !appState.selectedElementIds[element.id]) {
+ if (element.link && !appState.selectedElementIds[element.id] && !element.customData?.hideLinkIcon) {

# getElementLinkAtPosition (hit-tests the icon's spot)
- if (element.link && index >= hitElementIndex && isPointHittingLink(
+ if (element.link && !element.customData?.hideLinkIcon && index >= hitElementIndex && isPointHittingLink(
```

The files are big only because the prod build is minified onto one line, so the diff
carries that whole line.

**Why:** views on a canvas are Excalidraw `embeddable` elements whose `link` is the URL of the
item they show, so Excalidraw paints its link icon on every one. The icon is drawn on the
canvas (CSS can't hide it) and there's no option to turn it off. Hiding the icon isn't
enough: its spot still answers hovers and clicks, so hovering it showed a tooltip with the
raw URL, the cursor turned to a pointer, and clicking opened the URL. Items on a canvas set
`customData.hideLinkIcon` (`normalizeEmbeds` in `src/platform/modules/canvas/embeds.ts`),
and their title bar is the link instead.

**Upgrading Excalidraw:** pnpm refuses to install if the patch no longer applies.

1. `pnpm patch @excalidraw/excalidraw@<new-version>`
2. In the printed folder, add `&& !element.customData?.hideLinkIcon` to the condition in
   `renderLinkIcon` and in `getElementLinkAtPosition` (`dist/dev/*.js` and `dist/prod/*.js`).
3. `pnpm patch-commit <folder>`, delete the old patch, check a canvas shows no icon and hovering a view's top-right corner shows no URL tooltip, and that a narrow canvas (under 730px) still shows the desktop layout.

**Remove when** Excalidraw offers a built-in way to hide the icon.

### Always use the desktop layout

**What:** `isMobileBreakpoint` (in `App`) returns false, so Excalidraw never switches to its phone layout:

```diff
- return width < MQ_MAX_WIDTH_PORTRAIT || height < MQ_MAX_HEIGHT_LANDSCAPE && width < MQ_MAX_WIDTH_LANDSCAPE;
+ return false;
```

**Why:** below 730px of canvas width Excalidraw uses a layout built for phones, with a bar along the bottom
and a menu that pops up over the canvas. The app runs on a desktop but is often narrow, because it sits
beside an agent's sidebars. The desktop layout at a narrow width, with `canvas.css` keeping its top row on
one line, is easier to use.

**Upgrading:** in the new version, find where the editor decides `isMobile` (search `isMobileBreakpoint`)
and make it return false in `dist/dev/index.js` and `dist/prod/index.js`.

**Remove when** Excalidraw lets the host choose the layout.
