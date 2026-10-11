---
title: Assess an existing React system
description: Evaluate components, theme, and assets before proposing a maintainable import.
---

## Gather evidence

Ask for the accessible source repository, folder, or package. Inventory its reusable components, theme, fonts, icons, and shared images. Inspect JSX or TSX, re-exports, type definitions, package metadata, and existing stories or examples. A prototype idea is not required. Do not modify production source during assessment.

Trace the dependencies of the system's components rather than scanning an entire product indiscriminately. Include CSS imports, theme providers, fonts, icons, assets, build aliases, and runtime requirements.

Identify dependencies on routing, authentication, data fetching, application stores, environment variables, server code, and production services. Distinguish reusable interface components from product containers that orchestrate those services.

## Preserve the contract

Record exports and props, including defaults, variants, controlled state, callbacks, refs, children, and composition. For JavaScript components without types, use source and observed usage; label anything not established by evidence.

Record theme values, modes, typography, font weights, spacing, states, responsive behavior, and required providers. Locate actual font and icon sources. A similar font or approximate palette is a fidelity difference, not an exact match.

Compare source examples with the imported result under the same mode, viewport, state, and content. API compatibility includes callback and interaction behavior; matching prop names alone is insufficient.

## Propose a maintainable import plan

Classify the system's material:

| Outcome | Action |
| --- | --- |
| Portable | Connect the package or import source with required dependencies. |
| Bounded adaptation | Specify a small provider, alias, or scoped styling change and its fidelity implications. |
| Application-coupled | Prefer an existing presentation layer or ask the engineer for a reusable boundary. |
| Unverified | State missing evidence and what would establish compatibility. |

Do not reproduce a production backend, install a chain of service shims, or silently change the component API to make an import compile. Explain blockers and propose staged work where needed. Plan for the reusable system as a whole unless the person requests a subset. Keep prototype data simulation at the prototype boundary where possible.

Report proposed components, theme, assets, dependencies, adaptations, and the verification plan. Include source revision and known differences. Recommend package reuse when compatible and maintainable; source copying needs a clear update path.

## Verify an authorized import

Return to Setup Design System to integrate the agreed subset. Verify representative variants, interactions, pop-ups, and supported modes against source evidence. Record API, theme, and behavior differences separately. Identify unresolved differences and make the result reviewable by the engineer providing the system.
