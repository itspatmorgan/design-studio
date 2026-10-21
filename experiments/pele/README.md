# Pele renderer experiment — issue #67

Run on October 20, 2026 (America/New_York), on `codex/issue-67-pele-evaluation`. This is the bounded evaluation requested in [issue #67](https://github.com/itspatmorgan/design-studio/issues/67), not a renderer migration.

**Recommendation: defer migration; prefer Pele's lazy entry point for a follow-up integration.** Compatibility and rendering speed are promising. The full Pele import does not improve the first-flowchart compressed payload over Mermaid's existing lazy loading. Font readiness, width observation, and real canvas interactions still need integration work, and the layout differences below need acceptance before changing existing views.

Studio's renderer, source diagrams, root dependencies, contributor profiles, and configuration are unchanged. The repository currently has only its sample contributor, so this is kept as an isolated platform proposal without altering registration.

## Evidence and reproduction

- [Measured results and compatibility table](evidence/metrics.md)
- [All screenshot comparisons](evidence/index.html): Mermaid left, Pele right; 158 comparisons, split into 170 full-resolution image tiles where necessary.
- [Exact fixture snapshot](evidence/fixtures.json): 13 current diagrams, six stress fixtures, eight policy fixtures; hashes also appear in the metrics.
- [Probe results](evidence/summary.json): lifecycle, hidden/visible, resize, theme, limits, and eight-diagram page measurements.
- [Raw browser measurements](evidence/results.json.gz): `gzip -dc evidence/results.json.gz` yields JSON, including accessible-tree snapshots, timings, clipping diagnostics, resource requests, and long tasks.
- [Production chunk inventories](evidence/builds.json) and [unchanged Studio build manifest](evidence/studio-manifest.json).

From the repository root, install its pinned dependencies, then the experiment's separate dependencies:

```sh
pnpm install --frozen-lockfile
pnpm --dir experiments/pele install --frozen-lockfile
pnpm --dir experiments/pele exec playwright install chromium
pnpm --dir experiments/pele build
pnpm --dir experiments/pele preview
```

Keep that local preview running. In another terminal:

```sh
pnpm --dir experiments/pele measure
pnpm --dir experiments/pele lifecycle
pnpm --dir experiments/pele many
pnpm --dir experiments/pele summarize
python3 experiments/pele/package-evidence.py
```

The last command requires Pillow; only screenshot packaging needs Python. Generated raw captures live in ignored `results/`. The committed evidence is the dated run, not an automatically refreshed baseline. `build` collects the current `src/` corpus; compare hashes with the evidence snapshot when rerunning on another revision. The fixture collector scans Markdown backtick/tilde fences and standalone `.mermaid` files without rewriting them.

Open [the local comparison](http://127.0.0.1:4167) to select a fixture, palette, surface, or automatic direction. The preview binds only to localhost. The main measurement run blocks external requests and has a 12-minute browser watchdog; this is a test-run bound, not a production rendering deadline.

## Versions and method

Studio 0.1.1, source commit `8644fdcb41189ec1d1f629fd804b4476253cf0f1`; Mermaid 11.17.2; Pele **1.8.0**; Node 24.14.1; pnpm 12.9.1; Playwright 1.62.1; Chromium 151.0.7922.34; macOS arm64. npm reported Pele 1.8.0 as current, with registry metadata modified October 20, 2026, 18:59 UTC. The issue's 1.6.0 baseline has advanced. The package and integrity hashes are pinned in this directory's lockfile; npm did not expose a `gitHead` for this release.

The comparison uses published production packages, a Vite 8.3.1 production bundle, Studio's real Geist font/theme stylesheet, and its existing Mermaid theme function. Both use 14px fonts and the same neutral/Flexoki palette family. Pele's chart categories use the accent colors; Mermaid's current pie/journey mapping uses tinted surfaces. These semantic color mappings differ visibly and are not claimed to be pixel equivalent.

The four surfaces are 768px document, 360px narrow document, 960×600 full view, and 280×180 compact preview. The last two reproduce the shared component's SVG fit geometry; they do not mount the actual canvas or its pan/zoom handlers. Nineteen corpus/stress fixtures × two palettes × four surfaces produce 152 cases. Eight policy cases and six direction comparisons are additional.

Warm corpus measurements discard each fixture's first render and retain seven samples, giving 91 samples per renderer. The eight-diagram page test uses five warmed batches. Per-fixture p95 with seven samples and batch p95 with five samples are effectively maxima, not stable population tail estimates. Render API time combines parsing, layout, and SVG generation. DOM insertion, forced layout, and two animation-frame callbacks are measured separately; those callbacks indicate a paint opportunity, not paint duration.

Fresh-page loading measurements share one browser context and do not reset OS/HTTP caches. Localhost preview is not a cold network simulation. Raw/gzip/Brotli sizes are computed per emitted JS file, including requested shared/lazy dependencies and common harness code; they exclude CSS/fonts. No upstream speed or bundle-size headline is used as a Studio result.

## Findings

| Measure | Mermaid | Pele full | Pele lazy |
| --- | --- | --- | --- |
| First flowchart JS, gzip | 218.8 KiB | 255.2 KiB | 72.2 KiB |
| First flowchart JS requests | 35 | 4 | 19 |
| Fresh-page first render through frame opportunity | 78.6 ms | 35.3 ms | 44.3 ms |
| Warm corpus render median / p95 | 9.1 / 18.1 ms | 0.4 / 0.6 ms | See warmed page test |
| Eight-diagram page work median | 77.1 ms | 4.5 ms | 4.3 ms |
| Eight-diagram page through frame opportunity median | 77.5 ms | 16.5 ms | 16.6 ms |

The 480-edge stress graph rendered in about 402ms with Mermaid and 24ms with Pele in the light/document observation. This is one sample. The aggregate long-task log spans both engines; it is not an attributed Pele blocking measurement.

The full Pele chunk itself is 681,443 raw bytes, 247,558 bytes gzipped by Node. The lazy strategy reduces first-diagram loading substantially, but its full set of separate type chunks has overhead. See `rendererClosures` in the build inventory for static and all-type closure totals. The actual Studio production `mermaid.core` chunk is 94,510 raw / 32,295 gzip bytes **plus** shared code and diagram chunks. Its manifest references the shared application entry, so recursively counting every dynamic descendant would count unrelated Studio features. Harness loading totals are useful comparisons, not a promise of an equal application-wide bundle reduction.

### Visual compatibility

All 13 current diagrams and all six stress fixtures produced SVG in every tested palette/size. No source edits were necessary for this corpus. Automated text/viewBox checks found no Pele text escaping the SVG bounds. They cannot establish absence of overlaps, crossings, or semantic errors, and Mermaid HTML labels are outside that text-box check.

I reviewed contact sheets covering all eight palette/surface combinations and full-size examples for subgraphs, multilingual/styled labels, charts, and direction changes. Findings:

- Basic flowcharts preserve decisions, labels, and connections. Pele uses rounded shapes and different spacing/routing.
- Nested externally linked subgraphs change substantially: Pele follows the vertical subgraph direction where Mermaid lays the example horizontally. The group membership and connections remain, but visual reading order changes even with automatic direction disabled. See fixture 13.
- Narrow sequence diagrams wrap messages into taller rows in Pele. This preserves labels but changes the document's vertical rhythm. Diagram 01 illustrates this.
- Long labels, `<br/>` line breaks, bold/italic Markdown labels, class definitions, explicit stroke styles, Japanese/Arabic text, accents, and emoji are visible in fixture 15. Source-defined light fills remain light in dark mode in both engines; authored styles are distinct from host theme defaults.
- Pie charts retain values and category labels but change legend placement, title weight, size, and color saturation. Pele's dark chart is more saturated; matching the existing muted chart appearance would require a category-specific color decision, not simply swapping engines.
- The very long sequence and dense 480-edge graph remain impractically small when fitted into a compact preview with either engine. Rendering success is not a claim that these previews are readable. Full captures are tiled so detail can be inspected.

Start with `autoDirection: false` for full views **and** compact previews. For documents, also retain source direction initially: auto mode turns the basic flowchart from a wide layout into a vertical one at 360px, and turns the styled-label example from `808×82` into `230×382`. Offer automatic direction only as an explicit later policy if that change is desired. `false` preserves direction, not exact geometry: width-dependent wrapping can still change sizing.

### Accessibility, lifecycle, and policy

| Concern | Observed result / proposed policy |
| --- | --- |
| Accessible names/descriptions | Supplied `accTitle`/`accDescr` survive. Root references resolve; corpus accessible-tree snapshots are archived. |
| Multiple instances | Eight concurrent Pele diagrams have no duplicate IDs with unique per-instance prefixes. |
| Shared lifecycle | Experiment-only virtual component reuses the actual `MermaidDiagram.tsx` React effects and artifact controller, replacing only its private render function. Revision digests match displayed revisions after DOM commit. |
| Rapid updates | Delayed candidate render retains stale SVG while preparing; obsolete output does not replace the newest source. |
| Invalid input / recovery | Both component probes clear failed SVG, display error text, recover to current/ready, and clean up after unmount. No browser page errors observed. |
| Theme | Existing component redraw on theme change passes. Separate variable-update probe changes Pele colors without changing SVG markup, showing the possible future optimization. |
| Fonts / sizing | Geist is loaded before comparison rendering. Hidden-to-visible render becomes measurable; CSS scales an existing SVG from 675px to 280px. Late font arrival and width-triggered remeasurement are not implemented by the candidate. |
| Links / images | Candidate explicitly disables both; relative and external link fixtures produce no anchors, and image fixtures produce no images. Init directives cannot enable them in these probes. No icon or math resolver is supplied. |
| Existing strict mode | Mermaid still emits anchors for tested links and an image element for HTML-label input; an image-node fixture attempts a network load. The runner blocks it. Pele's disabled policy is deliberately stricter, not an assumption of policy equivalence. |
| Injection | Tested script/event markup does not produce executable elements/handlers in Pele output. Errors and metadata use text, not HTML. This is a regression probe, not a security audit of the library. |
| Limits | Pele rejects >50,000 source characters, >500 edges, and a deliberately tiny output limit. Mermaid rejects the edge case but returns SVG for the oversized-source case rather than rejecting its render promise. |
| Nesting | 80 nested groups render; this does not establish a safe nesting/work ceiling. |
| Portability | Mermaid source stays authoritative. Arbitrary HTML, JS callbacks, plugin diagrams, themeVariables and arbitrary icon/math markup are not accepted as equivalent supported features. See upstream compatibility documentation. |

No candidate navigation is enabled, so no diagram link keyboard action is expected. Browser accessibility snapshots are not a VoiceOver or cross-browser assistive-technology review. Relative/published links would require a new explicit navigation policy if enabled later.

## Decision and remaining gates

Keep Mermaid in production for now. The experiment supports further work on **lazy Pele rendering behind the existing component**, preserving Mermaid source and the artifact lifecycle, rather than maintaining two production renderers.

Before adopting, resolve three concrete gaps:

1. Accept the changed subgraph/sequence/chart appearance and choose the chart palette. Existing content appears usable in the inspected fixtures, but layout equivalence is not available.
2. Add font readiness/invalidation and measured-container-width handling to the real shared component, then verify actual standalone/document/canvas hosts, hidden panels, resize transitions, and canvas pointer/keyboard behavior. The isolated lifecycle probe deliberately keeps today's effects, which do not provide those Pele-specific mechanisms.
3. Establish a work budget for untrusted/worst-case diagrams. A synchronous render cannot be stopped by the component's 15-second JS timer. Use a terminable worker if a hard deadline is required. Confirm the actual-app lazy resource trace after integration, and include another browser and assistive-technology pass.

These are explicit limits of this research run, not claims of completed migration acceptance. The bounded comparison, fixture snapshot, screenshots, measurements, and recommendation are complete; production adoption remains a separate change.

## Validation

`pnpm build` passed for unchanged Studio; `pnpm test` passed all 375 ordinary tests. The isolated production build, corpus/policy assertions, shared-component lifecycle assertions, and multi-diagram measurements passed. Vite reports the existing large-chunk warnings; the isolated full Pele chunk also exceeds its 500kB raw chunk warning threshold. No warnings were suppressed.

Upstream references rechecked: [API](https://pele.run/api), [theming](https://pele.run/theming), [security](https://pele.run/security), [repository](https://github.com/obsidianmd/pele). The pinned installed declarations and bundle were used to check option names and behavior.
