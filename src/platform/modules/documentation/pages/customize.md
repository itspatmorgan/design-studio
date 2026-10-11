---
title: Modules & customization
description: Adapt your toolkit, settings, and studio capabilities.
order: 7
toc: true
---

## Where should I start?

Your own design system is usually the most useful customization. Bring in your components, theme, assets, and product knowledge so prototypes reflect your team. See [bringing in a system](/documentation/manual/prototypes#how-do-i-bring-in-my-own-system).

Choose the scope that matches the change:

| You want to change… | Change… | Affects… |
| --- | --- | --- |
| One exploration's appearance or behavior | Its prototype. | That exploration. |
| Reusable styles, components, or knowledge | A system. | Prototypes using it. |
| Name, defaults, or enabled capabilities | Studio settings. | The shared environment. |
| Add a distinct tool or section | A module where practical. | The studio using it. |
| Core interface or behavior | Platform code. | The shared application. |

You own the code. Ask your agent to explain the scope and make the result reviewable before adopting a shared change.

## How do I change settings?

Open **Studio settings** from the local gear icon or search. Registered contributors can view settings; Admins can edit them.

**General** controls the name, tagline, personal or team use, and default system. **Modules** controls installed optional capabilities. Changing the default through settings preserves existing prototype assignments.

Choose **Save changes** to save locally and restart Studio with the new configuration. **Discard** resets unsaved edits. If settings changed elsewhere while you were editing, reload before retrying the save.

Settings live in `studio.config.json` at the top of your project, a plain JSON file your team owns. Saving from Studio settings changes only the fields you edited, and editors that understand JSON Schema validate and complete the file. Your own design systems are listed there; Studio's own system is always available and is not listed.

Saving settings does not share or publish them. See [Personal & team use](/documentation/manual/team) for permissions and shared changes.
## What are modules?

Modules add capabilities such as Documents, Diagrams, and Canvases. Open **Studio settings → Modules** to enable or disable installed optional modules. Required capabilities remain enabled.

Disabling a module keeps its files and content, but hides its normal tools and navigation. Re-enabling makes supported content available again. Team use requires Contributors & Permissions.

Installing or removing a module is a separate agent task. Ask what will happen to its content before removal; removal can delete capability code and, when explicitly requested, associated content.

## Can my agent add a feature?

Yes. Describe what you need and ask the agent to assess whether a module fits. A module groups its code and integrates through supported platform connections, reducing coupling with the core.

For example, you might ask for a new review tool or artifact type. Ask for a proposal that explains the inputs, interface, affected parts, and how the result will be checked.

Modules run inside the application; they are not a protective sandbox. A faulty module can still affect Studio. Your agent can use the [module contracts](/documentation/context/platform.core/context/modules).

## How do I update my studio?

Studio does not automatically merge new releases into your folder. Updating a setup plugin does not upgrade that folder either.

Ask your agent to compare the update with your local changes, preserve existing work, and verify the application before adopting it. Changes kept to your systems, prototypes, contributors, settings, and your own modules update most easily; your agent can use the [ownership map](/documentation/context/platform.core/context/ownership) to check the rest. Custom systems, modules, and platform changes need maintenance as dependencies and upstream code evolve.

## Where do I add guidance for my agent?

Add your team's conventions and product context to `AGENTS.team.md` in the studio's root. `AGENTS.md` is generated from Studio's own instructions, the modules you have turned on, and your file, so don't edit it directly; ask your agent to run `pnpm studio sync` after you change the sources. Guidance that applies to one design system belongs in that system's own context.
