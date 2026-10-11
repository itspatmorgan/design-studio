---
title: Responsibilities
description: Ownership of platform, module, and system context and skills.
toc: true
---

Design Studio has two kinds of agent guidance: context and skills. Both belong to the capability or domain they describe.

## Choose the system of record

| Owner | Canonical root | Context | Skills |
| --- | --- | --- | --- |
| Platform | `src/platform/` | Design Studio principles, personas, shared working requirements, and technical context. | Cross-module tasks such as configuring a studio, contributor setup, module management, and documentation maintenance. |
| Module | `src/modules/<id>/` | Capability knowledge and the module README's authoritative technical requirements. | Tasks using or maintaining that capability. |
| System | `src/systems/<id>/` (Studio's own: `src/platform/systems/studio/`) | Product, brand, audience, design, component usage, and writing conventions. | Domain-specific tasks for that system. |

Context can describe facts, rationale, or standing requirements. Label requirements clearly; a context document is not necessarily optional advice. Skills define task triggers, required input, procedures, supporting resources, and completion criteria. Keep short relevant constraints in the skill when they do not need an independent shared document.

Root `AGENTS.md` supplies essential operating requirements and routes. System entry points select relevant product guidance. The Manual explains the environment to people; the Context and Skills browser displays original owner files. Neither surface creates another authoritative copy.

## Technical requirements

Each owner has a `README.md` entry point. A module README holds its main technical contract. Platform knowledge and contracts live together in `src/platform/context/`; `core/` holds implementation. These documents are technical context, including valid structures, supported interfaces, and compatibility requirements. Split a substantial specialized subject only when it needs its own maintained source and link it from the README.

Skills consult these documents without copying schemas or dependency matrices. Code and checks implement and enforce selected requirements; successful checks cannot prove that an agent read or understood guidance.

## Change the owner, then its consumers

Update implementation, authoritative technical context, affected skills, and Manual explanations together. A product convention cannot relax runtime, scope, or source-access boundaries.

Platform guidance lives in `src/platform/context/` and `skills/`. Module guidance lives beside its implementation. Studio's own system (`src/platform/systems/studio/`) retains application design guidance and its interface toolkit; it does not own platform operating procedures.

Use [Maintain Context](../skills/maintain-context/SKILL.md) to author context and skills. Use [Maintain Documentation](../skills/maintain-documentation/SKILL.md) to revise READMEs and audit consistency. [Documentation standards](documentation-standards.md) defines writing and metadata; [Agent context routing](agent-context.md) owns discovery and synchronization behavior.
