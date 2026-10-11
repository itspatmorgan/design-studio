# Contributing

Design Studio Starter is an early beta. The current priority is a reliable local workflow: studio initialization, contributor onboarding, prototypes and their file types, design systems, and the system content. Portable static publishing is part of the workflow; each studio chooses and configures its own host.

For local setup, follow [manual installation](https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md#manual-installation) and the [Manual](src/platform/modules/documentation/pages/index.md). Coding agents should start with [AGENTS.md](AGENTS.md), which points to platform context, principles, personas, and task skills.

## Proposing a change

Open an issue for a substantial feature or architectural change before investing in an implementation. Small fixes can go straight to a pull request. Describe the problem, the resulting behavior, and how you verified it. Include screenshots for visible changes.

Create a branch in your fork and submit a pull request to `main`. Changes to the platform, systems, system content, tooling, and configuration need maintainer review. Prototype changes follow the contributor ownership requirements in [Contributor scope](src/platform/context/contributor-scope.md); when building a new prototype, use `pnpm new "Prototype Name"`.

## Checking your work

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm format:check
pnpm studio sync --check
pnpm build:release
pnpm build:inspect
```

Use `pnpm test:changed <base> <head>` for affected regression groups, or add `--plan-only` to review the decision. [Checks and fixes](src/platform/context/checks.md#minimum-sufficient-verification) owns the dependency map and fallback policy. Use `pnpm test` during development for all focused regressions. `pnpm test:release` also exercises disposable setup and production fixtures. `pnpm build` validates current source, types, and static output without rerunning tests. `pnpm build:release` performs both release regressions and the build. Keep committed files below 750 KB. Include useful tests for behavior changes, and update the Manual or agent instructions when a workflow changes.

Run `pnpm studio sync` after changing canonical project skills. It synchronizes project routing and skill adapters. The setup plugin and its host manifests live in [design-studio-plugin](https://github.com/itspatmorgan/design-studio-plugin). Edit canonical sources instead of generated files. See [Agent context routing](src/platform/context/agent-context.md) for ownership and installed-studio packaging.

Use fictional sample data. Do not commit credentials, local environment files, proprietary design-system code, or company information you do not have permission to share. Check both files and commit history before publishing your own studio.

## Starter repository publishing

For any host, install with Node 24 and pnpm 12, run `pnpm build`, and publish `dist/`. The build validates source and types. Use `pnpm test` for focused regressions or `pnpm build:release` for full release verification. `pnpm build:inspect` reports startup asset size and requests. Your chosen host owns routing, caching, access, and deployment configuration.

The [Checks and deployment workflow](.github/workflows/checks.yml) publishes successful pushes to `main` only in `itspatmorgan/design-studio-starter`. The workflow selects affected regression groups and runs them concurrently with scope and bundling, caches dependencies, cancels obsolete validation, and checks commit freshness before deploying. Copies run checks without publishing; configure your own deployment when needed.

The starter repository uses GitHub Pages with **GitHub Actions** as its publishing source. Its configured site inherits `itspatmorgan.com` from the account’s user site and publishes at `/design-studio-starter/`; its custom-domain field is empty.

The workflow obtains the Pages base path and passes it to the build as `STUDIO_BASE_PATH`. To preview this repository’s subpath locally:

```sh
STUDIO_BASE_PATH=/design-studio-starter/ pnpm build
STUDIO_BASE_PATH=/design-studio-starter/ pnpm preview
```

See [Publishing](src/platform/context/publishing.md) for portable hosting, direct-link routing, and access requirements.

## License

Contributions are made under the repository's [MIT license](LICENSE). Keep applicable third-party notices when importing or adapting code.
