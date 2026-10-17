---
title: Shadcn configuration and design guidance
description: Use upstream expertise within a selected Studio system's curation workflow.
---

## Use upstream expertise

Consult the official [shadcn skill](https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/SKILL.md), its [CLI reference](https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/cli.md), and, for supplied design guidance, its [DESIGN.md procedure](https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/design-system.md). These references were reviewed on 2026-10-10 against installed CLI 4.21.0. Read current installed help when commands differ, and record the upstream revision used for a real import. Do not install an unscoped, automatically activated upstream skill into the Studio root. This local setup skill selects the system and owns the review loop; upstream guidance supplies library expertise.

Use `info --json` in the prepared workspace to resolve the actual base, style, icon library, aliases, and CSS path. Read the selected component's `docs` output and fetch its linked API/examples before composing or adapting it. Preserve Base UI versus Radix APIs, especially `render` versus `asChild`. Reuse the system's installed components before selecting new ones. Use the selected icon library consistently.

Pass a preset name or code to the installed CLI. For a builder link, use its `preset` query parameter; keep the code opaque. Do not decode opaque codes or construct encoded links manually. Use `preset resolve --json` after configuration to inspect the result. Inspect its `fallbacks`: inferred defaults are not evidence of the person's chosen font, theme, or radius, especially for adapted scoped themes. Preserve actual source and saved decisions. Presets and component base are separate choices; preserve the saved base unless explicitly changed. A theme/font-only refinement can use `apply --only theme,font` in staging; it does not switch icon implementations. Inspect local help first.

## Adapt the upstream workflow to Studio

Generate in a disposable workspace outside Studio, never in the Studio root or a system source folder. Use the manual staging procedure below. Upstream `add --dry-run` previews staging writes. Existing adapted components are not copied into staging, so this is not a comparison against their current Studio implementation. Compare selected generated source with those files before integrating updates; preserve intentional customization.

Replace the upstream full-catalog installation and standalone showcase with the smallest useful kit, live component examples, and a representative Studio prototype. Global `:root`, `.dark`, `@theme`, and global utilities from upstream are staging material: adapt them to the system's scoped theme, explicit inventory, supported modes, and portal contract. Never derive or enable another color mode merely because an upstream procedure recommends it. Fonts follow the supplied sources, licensed assets, or explicitly allowed substitutions.

## Manual staging

Inspect installed help, then run from the Studio checkout. For a new foundation, substitute the selected base and preset; `nova` with `base` is the default starting point:

```sh
staging=$(mktemp -d)
pnpm exec shadcn create --cwd "$staging" --name kit --template vite --base base --preset nova --no-monorepo --yes
pnpm exec shadcn info --cwd "$staging/kit" --json
pnpm exec shadcn preset resolve --cwd "$staging/kit" --json
pnpm exec shadcn docs button input --cwd "$staging/kit" --json
pnpm exec shadcn add input --cwd "$staging/kit" --dry-run
pnpm exec shadcn add input --cwd "$staging/kit" --yes
pnpm --dir "$staging/kit" build
```

For continuation, initialize staging with the saved base and style, then copy the target's `components.json` into staging before generating components. Preserve its choices and registries; remap `tailwind.css` to `src/index.css` and every alias into staging (`@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`). Inspect `info --json` to confirm all resolved destinations stay there. Copy a supplied DESIGN.md into staging unchanged. Existing scoped themes and adapted components remain comparison material; do not treat staging as their visual equivalent.

Review generated source and dependencies against the target before integrating selected files manually. Preserve Studio identities, workspace package names, scoped themes, system-relative CSS paths, and aliases; runtime utility imports use `#studio/runtime`. Never copy staging aliases or package manifests wholesale. Record the actual CLI/source versions and decisions once in the system's curation record, verify the integrated kit in Studio, then remove the disposable workspace.

## Translate a DESIGN.md

1. Read the supplied path, URL, or pasted document. Preserve the original guidance and source provenance in the system's context. For a remote document, retrieve it first; pass a saved local file to `--design-md`. Do not guess inaccessible content.
2. Read frontmatter and prose, including hard rules and known gaps. Summarize explicit values and unresolved choices: semantic color roles and states; font families and type scale; spacing; radius and elevation; control sizes and density; focus and interaction rules.
3. Reuse an explicit preset. Without one, choose upstream geometry that fits the document, explain the choice briefly, and pass it as `--preset`. Colors alone do not determine the component style. Existing systems retain their configuration unless a change is intended.
4. Map values into the system's semantic tokens and selected component variants. Preserve exact scales rather than assuming upstream radius multipliers or control heights match. Check composed typography classes for merging conflicts. Record missing values and proposed adaptations rather than inventing brand requirements.
5. Review foundations in Studio, then verify the selected component states, keyboard behavior, focus, popups, and responsive prototype in supported modes. Save decisions and the next action in the system's curation record. A build establishes structural validity; browser evidence and human direction establish fidelity.
