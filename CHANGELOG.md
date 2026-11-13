# Changelog

## Unreleased

- Turning a module off or removing it never breaks your studio. A module whose library your code imports keeps that code working while it is off (DialKit's dials keep their values, with no panel or menus), and removing it rewrites that code into plain values first. A module that can do neither is refused, in Studio settings and the CLI, naming the files that use it.
- DialKit: tune a prototype view with live dials, then press **Save to code** to write the values into the view as its new defaults. Right-click a view and choose **Add DialKit**, ask your agent for the dials you want, and **Remove DialKit** when you're done; the design stays as tuned. Hide the panel from the prototype's menu or with ⌘⇧;. It works with and without a design system, and never shows on published sites or embedded views. The Feedback Inbox overview and the Design Studio Marketing landing v3 show it in use. It's an optional module, on by default; turn it off in Studio settings.
- Modules can add actions to the menus of file types they don't own (`ModuleApp.artifactActions`), and a module library may load a package's own stylesheet.
- Agents can draw Mermaid on a canvas as editable shapes and arrows: the canvas `mermaid` tool, live and with `pnpm canvas`, takes flowchart, sequence, class, state and ER diagrams, Gantt charts, timelines and quadrant charts. It uses Excalidraw's own converter, the one behind pasting Mermaid onto a canvas, and reports each Mermaid node's element id so agents can move or restyle it.
- Canvas runs on current Excalidraw (0.18.0-3c916c5) and diagrams on Pele 1.13. Sticky notes are Excalidraw's native sticky note: press **N** or pick it from the toolbar, choose from five colors, and the text shrinks to fit before the note grows. Agents make the same notes with the `note` kind. **Breaking:** the Library is gone, along with its example sticky note. Notes already placed from it stay on your canvases as ordinary shapes; ask your agent to convert them to sticky notes if you want the new behavior.
- Search (⌘K) recognizes the prototype you have open, so choosing it keeps you on the artifact you're viewing instead of jumping to its first one. Thanks @robcrock.
- A system's Resources search finds components by their file names and paths, such as `button.tsx` or `button.examples.tsx`. Thanks @robcrock.
- A system's Overview and Icons source action opens its `intro.tsx`, including Studio's own, instead of an unavailable `system.ts`. Thanks @robcrock.
- Closing the artifact filter clears its query, so a hidden search no longer leaves the tree empty. Thanks @robcrock.
- A pull request or branch opens in GitHub Codespaces with editing working: the studio installs, starts, and opens in a browser tab. Reviewers who haven't joined the studio edit as the sample author.
- `pnpm check:links` checks every relative link, heading anchor, and `/documentation/...` link in Markdown guidance, and CI runs it.
- Root `AGENTS.md` now carries the standing working rules in its own Working in Studio section; `src/platform/context/working-in-studio.md` is gone, and `pnpm studio context --json` no longer lists it under `guidance`. Skills keep their routes in a Skills section that module routing follows.
- Maintainer-only platform context (checks, resource identity, editing and saving, community contributions, releasing) moved to `src/platform/context/maintainers/`. Links to the old paths or `/documentation/context/platform.core/context/<name>` addresses need `maintainers/` added.
- Task skills no longer repeat the contributor scope line that `AGENTS.md` already requires; it stays in the contributor skills.
- Component pages credit only the libraries whose `components` list includes that component. A system's `origin` no longer credits every component, so components ported from elsewhere are no longer attributed to shadcn/ui. The starter systems now list their shadcn components. A team system that credits shadcn should list its shadcn components in that library's `components`.
- A `Link` whose path doesn't resolve renders in place, inert and outlined in development, and the console names the path. Before, it failed the whole view, so one link in shared chrome took down every page.
- `pnpm check` ends with one line per system listing every missing token, with Tailwind's default value beside each.
- `/systems/<folder-name>` redirects to the system's permanent address.
- `useColorMode()` from `#studio/runtime` reads the nearest theme boundary's mode, for code that used to watch `.dark` on `<html>`.
- A component folder with an `index.ts` is one component: its other files are internal parts, so ported components no longer need renaming to stay off the component list. A file inside it with its own docs or examples still gets a page.
- `pnpm canvas … create` warns when new elements repeat existing content, so a retried call doesn't silently duplicate a canvas.
- Prototype and system code no longer sees Node types, so `window.setTimeout` returns a number again.
- Views that import local images or fonts now pass preview verification instead of showing a permanent "could not be verified" warning.
- `rename-system` no longer edits upstream platform files, and platform tests no longer read the starter systems, so renaming or deleting a starter keeps `pnpm test` passing and updates clean.
- The theme scope check accepts sibling selectors inside the theme, such as `.theme .a + .b`; `.theme + .b` still fails.
- Studio's Tailwind Typography classes are now `studio-prose`, so a system's own `prose` class no longer picks up the plugin's styles. Team code that used Studio's `prose` classes should switch to `studio-prose`.
- `pnpm studio --help` (or `--help` after any command) lists every command and option. `configure` usage shows that omitted settings are kept.
- Files written directly (by an agent or an editor) no longer need `pnpm studio identify`: the running dev server gives new views, documents, and canvases their permanent identity as they appear, in prototypes you can edit, and `pnpm canvas` does the same for its prototype and builds a fresh manifest instead of reading a stale one. `pnpm studio identify` remains for work without the dev server, and its preview now lists files instead of example IDs.
- CLI commands no longer tell you to restart the dev server after configuration, module, or system changes; it already restarts itself.
- When the CLI, an agent, or another tab changes the studio's configuration, open tabs show **Applying changes** until the restarted studio has loaded, instead of the old studio and then a blank page. Leaving Studio settings while a save applies no longer keeps that screen over every page in the tab. Starting the studio, or turning a module on or off, no longer reloads the page a second time once a view loads its system's packages.

- Describe how to propose an improvement and what happens next in `CONTRIBUTING.md`, with a feature proposal issue form. Maintainers follow a new [community contributions](src/platform/context/community-contributions.md) guide to assess, adapt, release, and credit outside work.
- Report bugs through a bug report issue form. Maintainers triage each issue as now, later, or close, and reply with the outcome; the community contributions guide gives the decision rules and the brief an agent drafts for the maintainer.

## 0.1.3 (2026-11-01)

- Zoom and pan standalone Mermaid diagrams with pinch, scroll, drag, arrow keys, and canvas-style zoom controls. Canvas previews and document fences stay fitted. Thanks @robcrock.
- Add an optional `zoomable` setting to `MermaidDiagram` for fitted, full-page diagrams; existing callers are unchanged.
- Show "Rendering diagram…" only when rendering takes longer than 200 ms, so fast diagrams no longer flash it.

### Updating from 0.1.2

Follow the [manual upgrade guidance](src/platform/context/ownership.md#updating-a-studio) and preserve local content and settings. No dependency, file, or migration changes are required. Standalone diagram pages gain zoom automatically; document fences and canvas previews are unchanged.

## 0.1.2 (2026-10-21)

- Render shared Mermaid diagrams with Pele, loading diagram types on demand in documents, reference pages, and standalone diagrams.
- Measure diagrams after their fonts load, redraw for font and container changes, and defer hidden previews until they become measurable. Canvas zoom preserves diagram layout, and unrelated page fonts cannot block rendering.
- Keep diagram links and images disabled under host policy, with explicit source, edge, and SVG output limits. Add focused browser regressions for rendering, lifecycle, and accessibility.

### Updating from 0.1.1

Follow the [manual upgrade guidance](src/platform/context/ownership.md#updating-a-studio), preserve local content and settings, and install the updated dependencies. Stored diagram files remain Mermaid source; no file migration is required.

Review existing diagrams for Pele syntax support and appearance. Arbitrary HTML labels, Mermaid theme variables, external plugins, and layout overrides are not equivalent supported features. See [diagram defaults and limits](src/platform/context/diagrams.md#customize-the-defaults). Excalidraw retains its own renderer.

## 0.1.1 (2026-10-17)

A leaner foundation with the same core Studio experience. This beta release simplifies development and maintenance workflows while retaining data-integrity, identity, permissions, and recovery checks.

- Replace managed upgrades and scripted releases with reviewed Git workflows.
- Retire managed extension downloads and provenance locks; keep local module/system scaffolding and integrate external source through reviewed repository edits.
- Discover regression tests directly, simplify CI, and retain individual module-availability probes alongside two combined production configurations.
- Remove compatibility snapshots, benchmark machinery, duplicate tests, and repeated build/type checks.
- Consolidate agent maintenance guidance and use the installed upstream shadcn CLI in a disposable workspace instead of a Studio wrapper.
- Report immediate Studio/preview startup sizes and the largest deferred chunks in build inspection.
- Use Hugeicons throughout Studio chrome and remove the unused Lucide dependency.

### Updating from 0.1.0

Review the release diff and merge the release tag on an upgrade branch using [manual upgrade guidance](src/platform/context/ownership.md#updating-a-studio). Preserve local work, reconcile dependencies, run `pnpm studio sync`, and verify the affected workflows before merging.

- `pnpm studio update` and `pnpm release` are removed. Use the documented manual Git upgrade and release procedures.
- `pnpm studio add` and `create-module`/`create-system --out` are removed. Scaffold locally, then review and integrate external source and dependencies manually.
- `pnpm prepare-shadcn` is removed. Follow [manual shadcn staging](src/platform/modules/systems/skills/setup-design-system/references/shadcn.md#manual-staging); never run upstream initialization in Studio or a system source folder.
- `pnpm test:changed` and `pnpm contract` are removed. Use `pnpm test`, `pnpm test:release`, and the production build. Public declarations and current consumers are the source of truth; this beta has no backwards-compatibility gate.
- The optional `ModuleSpec.upstream` field is removed. Keep meaningful source provenance in the owner's documentation and preserve required license notices.
- `.studio/ownership.json` and `studio.lock.json` are no longer read. Git records maintenance history; contributor permissions and permanent identities remain enforced separately.

## 0.1.0 (2026-10-14)

Design Studio’s first public beta, 0.1.0. Build and explore product ideas with your coding agent in a local workspace you can make your own.

- Create interactive screens, documents, diagrams, and canvases together in a prototype.
- Use design systems to share components, themes, and project context across your work.
- Explore the Feedback Inbox and Marketing examples, including working screens, alternate states, and an annotated handoff canvas.
- Customize the full source code and publish a read-only site for others to try.
- Improved first-visit onboarding, studio and file updates, and permanent links to your work.

This is early beta. Published sites have no built-in sign-in; use your hosting provider’s access controls for private work.
