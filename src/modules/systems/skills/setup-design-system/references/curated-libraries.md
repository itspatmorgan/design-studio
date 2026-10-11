---
title: Curate from libraries
description: Select a small library kit for an intended prototype without replacing unrelated systems.
---

## Define the first useful kit

Translate the intended prototype into a short inventory: screens, interactions, states, required components, and visual foundations. Reuse suitable installed components before adding more. Include supporting dependencies needed by selected components, but do not import an entire catalog.

Show the proposed kit and its purpose. Let designers specify components and theme details directly. Help product managers review the flow and visual direction without requiring them to choose technical primitives.

## Direct and review in the browser

Use [System curation](../../../context/curation.md) for the Overview summary and staging command. Read an existing curation record and inspect actual progress before restarting setup.

1. For shadcn, offer its [builder](https://ui.shadcn.com/create) to explore themes, fonts, icons, and styles. Reuse a supplied preset or builder link. Recommend Base UI unless the person chooses another base. Do not recreate upstream controls in Studio.
2. Establish the first useful direction. For supplied DESIGN.md, follow [shadcn configuration and design guidance](shadcn.md). A preset and DESIGN.md can be used together. Separate explicit design values from proposals and missing materials.
3. Save the agreed direction, source links, and next action in one system-owned curation record. Keep Overview's toolkit summary current.
4. Prepare upstream material with `pnpm prepare-shadcn`. Reuse the system's configuration when continuing; supply a preset only when choosing a new starting configuration. Run its printed commands in the isolated workspace. Read the resolved configuration and component documentation, and inspect selected payloads and dependencies before integrating them. Save the reviewed configuration using the plan's `saveConfigCommand`.
5. Integrate foundations, then open the relevant theme, font, and icon pages for review. A foundation can be useful before any components arrive.
6. Integrate the small component kit and open live examples, including pop-ups and required states. Then build or reuse a representative prototype and save its permanent ID in the curation summary.
7. After each meaningful step, update the summary and next action. Carry out authorized mechanics without extra approval. Pause only for unresolved design choices or scope decisions. Mark the final stage after verification and human review, not file presence.

## Import selected components

Read the source library's current official documentation and inspect installed CLI help before choosing commands:

- [shadcn CLI](https://ui.shadcn.com/docs/cli) and [configuration](https://ui.shadcn.com/docs/components-json).

1. Inspect the target system's `components.json`, dependencies, and declaration. Follow [shadcn configuration and design guidance](shadcn.md) for upstream skills and commands. Studio has no root shadcn configuration; system folders are not independent CLI projects. A component output path alone does not redirect CSS or dependency writes.
2. Preview proposed changes when supported. If a CLI cannot isolate every write, generate in a temporary workspace and integrate selected files deliberately. Do not run library initialization over the existing studio.
3. Select components by name. Review transitive dependencies, global CSS, fonts, and license or account requirements. Use material the person can access and is authorized to use.
4. Install reviewed dependencies in the selected system’s workspace, then adapt imports, scoped tokens, portals, and assets to the system contract. Preserve component APIs. Document intentional adaptations and the upstream version or revision.
5. Verify required states in examples and one representative prototype. Add components or tokens when that work demonstrates a gap.

Do not use bulk installation, overwrite existing components, or apply a global theme preset merely to accelerate setup. Starter systems demonstrate integrations; their presence does not prove every upstream component already works here.

## Return to the workflow

Return to Setup Design System for documentation, registration, default changes, migration, and verification. Leave existing prototypes and starter systems available until the person chooses their disposition.
