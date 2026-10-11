---
title: "Technology stack"
---

This reference is for maintainers and people who want to inspect or extend the code. Your agent can use these projects' documentation.

## Core stack and replaceable defaults

The platform uses React, TypeScript, Vite, TanStack Router, and Tailwind CSS. Replacing these requires platform work rather than a configuration change.

The starter design systems use shadcn/ui and Base UI. Your prototype design system can use another component library with its own APIs.

GitHub Actions supplies the included repository checks. Another Git host needs equivalent checks configured separately. Hosting is independent of these choices.

Documents and Canvases are optional modules. The system context and Manual keep their own Markdown support when prototype Documents is disabled.

## App and build

| Project | Purpose |
| --- | --- |
| [React](https://react.dev) | User interface. |
| [TypeScript](https://www.typescriptlang.org) | Type checking for `.tsx` views and platform code. Plain `.jsx` views are also supported. |
| [Vite](https://vite.dev) | Local dev server and production build. |
| [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview) | App routes and URLs. |
| [react-error-boundary](https://github.com/bvaughn/react-error-boundary) | Recovery from view rendering errors. |

Routes live in `src/platform/app/router.tsx`.

## Components and styles

The starter uses [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) components built on [Base UI](https://base-ui.com).

Starter components use Base UI's `render` prop for composition. Replacement design systems can use different component APIs.

[HugeIcons](https://hugeicons.com) supplies platform icons. [Lucide](https://lucide.dev) supplies starter product icons. The platform uses [Geist](https://vercel.com/font).

## Documents and canvases

[MDX](https://mdxjs.com) compiles plain Markdown. [Shiki](https://shiki.style) highlights code with the shared [Flexoki](https://stephango.com/flexoki) accent palette. [Tailwind Typography](https://github.com/tailwindlabs/tailwindcss-typography) styles document pages.

[Mermaid](https://mermaid.js.org) renders fenced `mermaid` blocks as diagrams in the shared Markdown reader. It loads on demand for the Manual, system context, reference pages, and prototype Documents. Diagram source stays in the Markdown file. A minimal platform theme coordinates diagrams with the editor and document code. See [Diagrams and code](/documentation/context/platform.core/context/diagrams) for examples and customization.

The canvas module uses [Excalidraw](https://excalidraw.com). It loads when a canvas opens.

## Local tools and checks

[Mise](https://mise.jdx.dev) pins [Node](https://nodejs.org) and [pnpm](https://pnpm.io) versions. [Husky](https://typicode.github.io/husky/) runs local Git hooks.

The workspace sets pnpm's [dependency verification](https://pnpm.io/settings/build#verifydepsbeforerun) to `warn`, so commands can reach update recovery before installing a merged dependency graph. Installation remains explicit; CI and release checks use `pnpm install --frozen-lockfile`.

[GitHub Actions](https://docs.github.com/en/actions) runs scope, asset-size, and build checks for pull requests and pushes to `main`.

## Built site

The production build is a static site in `dist/`. A host must serve `index.html` for app paths that do not identify an asset.

See [Publish a studio](/documentation/context/platform.core/context/publishing) for routing and publication requirements. Hosting configuration and access control are the studio maintainer's responsibility.
