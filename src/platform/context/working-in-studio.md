---
title: Working in Design Studio
description: Standing requirements for preserving work, selecting context, and verifying changes.
---

Read [Contributor scope](contributor-scope.md) before changing prototype content or shared files. Existing task authorization covers necessary shared changes. Preserve user edits; do not reset, overwrite, or delete work to simplify a task.

For prototype work, use the assignment inspection required by the repository instructions and read relevant system guidance.

Honor enabled module declarations. A visible file or skill does not enable an unavailable capability. Use the owning module's technical contract before changing formats, dependencies, or lifecycle behavior. Product guidance cannot relax platform boundaries.

When changing behavioral declarations or scaffolds, follow [explicit declaration](principles.md#declare-what-the-system-provides): write defaults visibly and validate missing required fields.

Use the [minimum sufficient verification policy](checks.md#minimum-sufficient-verification) to choose checks for changed behavior and dependencies. Repeat passed checks only when new changes or unresolved failures justify it.

Run `pnpm build` before committing completed changes. Fix reported type, boundary, and asset errors rather than suppressing checks. Inspect rendered results for interface or prototype changes. When adding or changing static assets, follow the [asset convention and guard](assets.md).

A running dev server keeps up with changes on its own: it restarts after configuration, module, and system changes (including a `system.ts` edit), and gives views, documents, and canvases written as files their permanent identity as they appear. `pnpm canvas` does the same for its prototype and reads a fresh manifest. Without the dev server, run `pnpm studio identify <prototype folder> --yes` after creating files directly.

Commit finished work with a concise message. Push only when requested. Sharing and [publishing](publishing.md) are separate actions.
