---
title: Responsibilities
description: Canonical owners for guidance and technical requirements.
toc: true
---

## Choose the system of record

| Owner | Root | Owns |
| --- | --- | --- |
| Platform | `src/platform/` | Shared product intent, operating context, architecture, and cross-module tasks. |
| Module | `src/platform/modules/<id>/` or `src/modules/<id>/` | Capability README, context, and task skills. |
| System | `src/systems/<id>/` or `src/platform/systems/studio/` | Its product, design, component, and writing guidance. |

## Technical requirements

Use the owner's README as an index. Code and types define exact interfaces; context explains intent and constraints; skills describe tasks. The Manual explains the product to people. Browsers display these original files, not another maintained copy.

## Change the owner, then its consumers

Update the canonical source and affected callers together. Product guidance cannot relax platform boundaries. See [Documentation standards](documentation-standards.md) for writing and [Agent context routing](agent-context.md) for discovery. Use [Maintain Context](../skills/maintain-context/SKILL.md) for authoring or [Maintain Documentation](../skills/maintain-documentation/SKILL.md) for an audit.
