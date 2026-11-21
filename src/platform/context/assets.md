---
title: "Assets and fonts"
---

Keep fonts, icons, logos, images, and other static files with the scope that owns them. Assets are part of a system alongside its theme, components, context, and skills. Asset folders are ordinary directories; they need no registration.

## Locations

| Owner or purpose | Location |
| --- | --- |
| Shared Studio UI assets | `src/platform/systems/studio/assets/` |
| A design system's brand assets and fonts | `src/systems/<id>/assets/` |
| Assets intentionally shared across prototypes and systems | `src/lib/assets/` |
| Assets used by one prototype | `src/prototypes/<contributor>/<prototype>/assets/` |
| Files that need a fixed public URL or unchanged filename | `public/` |

Create a directory when it is needed. Module-specific platform assets can live in that module's `assets/` folder, so they leave with the module.

Within a system, use recognizable subfolders such as `fonts/`, `icons/`, and `images/` when useful. Package-provided fonts and icons can remain dependencies rather than copied files. Declare those dependencies in package metadata and describe their source and usage in the system README. Local asset discovery does not activate a theme, font, or icon library; imports and scoped usage remain explicit.

A team logo or font used by its product views usually belongs to the assigned design system. Studio's logo and fonts belong to the platform. Use `src/lib/assets/` only when reuse is independent of a particular system.

## Imports and URLs

Prefer source imports for assets used by React code. CSS can reference local files with relative `url()` paths. Vite resolves these references and generates production asset URLs.

For example, a Product view can import `@/systems/product/assets/logo.svg`. A font referenced from `src/systems/product/styles/theme.css` can use `url("../assets/fonts/brand.woff2")`.

The repository's Vite configuration serves `public/` from the site root and copies its contents unchanged into the build. Reference `public/favicon.svg` as `/favicon.svg`, without `public` in the URL. Public files are site-wide URL resources, rather than scoped source imports.

See [Vite's static asset documentation](https://vite.dev/guide/assets.html) for import and public-directory behavior.

## Scope and fonts

Asset imports follow the same boundaries as code: a prototype can import its own assets, its assigned system's assets, and shared `src/lib/` assets. It cannot import private platform assets, another prototype's assets, or another system's assets. Shared assets cannot depend on those scopes.

Define system font usage in its scoped theme or components. When systems ship different fonts, use distinct font-family names; font-face registration is global even when the theme's use of it is scoped.

Assets support artifacts; they do not become navigable artifacts themselves. Follow the repository's [prototype workflow](../modules/prototypes/skills/build-prototype/SKILL.md) for asset-size checks and the [system contract](../modules/systems/README.md) for theme scoping.

## Asset Guard

Asset Guard prevents oversized files from entering Git history. The pre-commit hook in `.husky/pre-commit` runs `src/platform/node/check/check-asset-size.js --staged`. It checks added and modified files using their staged contents and blocks the commit when a file exceeds the limit the studio declares. CI runs the same guard against committed changes.

The guard applies to all files, including assets in `public/`. Existing oversized files are checked when modified.

Resize or compress a flagged asset, then stage the smaller version and commit again. For images, use WebP or compressed JPEG at the display size.

Whether to keep larger files is the team's decision. The studio declares Asset Guard's settings in `assetGuard` in `studio.config.json`. A new studio starts with `{ "limitKB": 750, "exceptions": [] }`; a team that allows a video might have:

```json
"assetGuard": {
  "limitKB": 2000,
  "exceptions": [
    { "path": "src/prototypes/me/onboarding/assets/tour.mp4", "reason": "Already compressed with H.265" }
  ]
}
```

`limitKB` is the largest file, in KB, a commit may add or change; Admins can also change it in Studio settings under General. Each exception approves one file, by its path from the repository root, and says why it stays that size. The guard reads `assetGuard` from the same staged copy or commit as the files it checks, so an approval counts once it is committed alongside them. A missing or invalid `assetGuard` stops the check and names the problem.

## Large files

Git keeps every committed version of every file, so deleting a large file later does not remove it from history. Every clone downloads all of it, and media files barely compress against earlier versions, so each changed version adds close to a full copy. Catching a large file before commit keeps the repository and future clones small.

Design Studio has no built-in support for large media today. If your team wants video, large raw images, or other heavy media in prototypes, use a tool built for it:

- [Git LFS](https://git-lfs.com/) keeps large files out of Git history and stores pointers in their place. Files tracked by LFS are small pointers in Git, so Asset Guard passes them without an exception. Check that your Git host and any Codespace or CI setup fetch LFS files.
- External media hosting, such as a video platform, a CDN, or object storage, keeps the file out of the repository entirely; prototypes reference it by URL.

Nothing in Studio prevents either approach.
