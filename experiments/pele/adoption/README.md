# Pele adoption checks

Completed October 20, 2026, on `codex/issue-67-pele-evaluation`, after the user approved the comparison's visual differences and authorized adoption.

The shared `MermaidDiagram` component now loads **Pele 1.8.0 through `pele/lazy`**, then loads only the requested diagram type. All existing callers and Mermaid source files retain their interfaces/formats. The old global Mermaid initialization/render queue and canvas-based hex theme conversion are removed from runtime. The original comparison renderer/theme are preserved in `../baseline/`, and Mermaid 11.17.2 is a direct dependency only of the experiment package. Other libraries may retain their own transitive Mermaid dependencies.

## Integration behavior

- Rendering explicitly waits for the actual regular/monospace font families and the document's pending fonts before text measurement. Failed font loads can use the browser's fallback fonts. Loading completion/error invalidates cached text measurements and the render revision.
- `ResizeObserver` measures the host's intrinsic content width, excluding padding. Ancestor font/mode changes also remeasure. Zero-width hidden hosts retain prior output with unknown evidence and resume on reveal.
- Input revisions include source, measured width, actual font families, color mode, and invalidation revision. Prior SVG remains stale during preparation; current output commits after insertion; failure clears it. Superseded and unmounted jobs cannot commit.
- Palette values use CSS variables from Studio tokens and Flexoki accents. Source direction stays fixed (`autoDirection: false`) across document, full, and compact views. Color-mode changes redraw, preserving the lifecycle behavior.
- Diagrams add no pan/zoom/navigation handlers. Canvas transforms scale the SVG without changing its intrinsic layout or source/input revision.
- Host policy disables links, images, and custom icon/math resolvers, and fixes source/edge/output limits at 50,000 / 500 / 4,000,000. The existing asynchronous watchdog remains a soft wait bound; synchronous rendering is not interruptible by that timer. This adoption does not claim a hard CPU deadline.

Pele is pinned exactly. pnpm records a release-age exception specifically for the tested 1.8.0 release; no broad exception was added.

## Browser checks

`check-adoption.mjs` uses Chromium against the actual production Studio build plus a component regression page styled with Studio's built CSS. [Raw results](checks.json) include measured geometry, revisions, accessible output, and empty browser-error results.

| Check | Result |
| --- | --- |
| Actual Geist font requests held | No SVG before font release; ready/current SVG after release |
| Late font registration after fallback output | Render revision and viewBox change after font arrival (263px → 244px in the probe) |
| 768 → 360 → 280 → 768 host resizing | New input revisions; SVG fits the available width |
| Zero-width hide, source edit, reveal | Latest source renders when the host becomes measurable |
| Pending new font with prior SVG | Prior SVG remains mounted and marked stale |
| Two source changes while font is pending | Only newest source commits after release |
| Unmount while font is pending | Releasing the request cannot recreate output; no page errors |
| Invalid syntax and recovery | Failed SVG clears; corrected source returns to ready/current |
| Actual Studio context document | Seven diagrams render; IDs are unique; accessible-tree snapshot recorded |
| Actual narrow document / standalone full view | SVG remains rendered and fitted |
| Existing Breadboard canvas | Shared diagram embed reaches ready/current in light and dark modes |
| Wheel over the diagram | Canvas pans |
| Modifier-wheel over the diagram | Canvas zooms; intrinsic host width and renderer input revision stay unchanged |
| Keyboard activation of embed header | Opens the standalone diagram |
| Development mode | Actual Markdown and canvas render without page errors; see [dev results](dev.json) |

The actual-host checks use existing source without editing prototype content or scenes. Browser accessibility inspection and keyboard activation passed; this is not a separate screen-reader certification or a multi-browser test run.

Screenshots: [document](document.png), [standalone](standalone.png), [canvas light](canvas-before.png), [canvas dark after pan/zoom](canvas-after.png), [component dark](component-dark.png).

## Reproduce

After dependency installation and `pnpm build`, run the Studio production preview on localhost port 4173. Build the isolated experiment and run its preview on port 4167 as described in the parent README. Then:

```sh
node experiments/pele/check-adoption.mjs
node experiments/pele/lifecycle-run.mjs
```

The adoption runner discovers the actual production CSS/font URLs from `dist/.vite/manifest.json`. Its font requests are deliberately held only inside an isolated browser context. Its whole-run watchdog closes the test browser after two minutes. No delayed-font hooks or test switches are present in the production component.

## Repository verification

- `pnpm build` passed: manifests, module boundaries, types, and production compilation.
- `pnpm test`: 375 passed.
- `pnpm test:release`: 381 passed, including production/module lifecycle fixtures after the dependency change.
- `pnpm build:inspect`: all manifest references resolve. Studio startup: 19 JS/CSS files, 365.6 KiB gzip JS and 87.9 KiB gzip CSS. This is the whole application startup, not an isolated renderer payload comparison.
- Shared-component lifecycle probe and adoption browser assertions passed with no page errors.
- Development Markdown and actual canvas smoke checks passed.
- Existing large deferred-chunk warnings remain; none were suppressed.

The dated comparison evidence in `../evidence/` remains unchanged. This report supersedes its initial deferral recommendation and its font/canvas integration gaps.
