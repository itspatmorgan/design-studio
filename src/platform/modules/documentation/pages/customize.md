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

Yes. Describe what you need and ask the agent to assess whether a module fits. A module groups its code in its own folder and connects to Studio only through Studio's public API, so platform updates are less likely to break it. Each module also names the oldest Studio version it works with; Studio turns off a module that needs a newer one and says why.

For example, you might ask for a new review tool or artifact type. Ask for a proposal that explains the inputs, interface, affected parts, and how the result will be checked.

Modules run inside the application; they are not a protective sandbox. A faulty module can still affect Studio. Your agent can use the [module contracts](/documentation/context/platform.core/context/modules).

## How do I update my studio?

New versions of Design Studio come out as numbered releases, such as 0.2.1. Your studio doesn't change on its own: you choose when to take a release, and your work stays yours.

Ask your agent to update your studio. It runs `pnpm studio update`, which:

1. Checks that your work is saved in Git. Commit your changes first.
2. Finds the newest release. You can ask for a specific one instead.
3. Makes a separate branch for the update, named after the release, so the version you are working on stays exactly as it was.
4. Brings the release's changes into that branch. Your prototypes, contributors, systems, settings, and your own modules are kept as you left them.
5. Checks that the studio still works and builds.

You can ask your agent for a preview first: it shows which release you would get and which files you changed that the release changes too, without changing anything.

If you or your agent changed a part of Studio that the release also changed, the update stops and lists those files. Your agent can help you decide what to keep from each side, or cancel the update and leave everything as it was. Keeping your changes to your own systems, prototypes, settings, and modules, rather than Studio's own code, makes updates smooth.

When the update finishes, try your studio on the update branch. When you're happy, merge the branch into your own (in a team, through a pull request). Your studio records which release it is on, so the next update knows where to start.

The first time, your agent may need to connect your studio to the Design Studio project with `git remote add upstream https://github.com/itspatmorgan/design-studio-starter.git`; the update command says so. Updating a setup plugin does not update a studio folder. Your agent can use the [ownership map](/documentation/context/platform.core/context/ownership) for the details.

## Where do I add guidance for my agent?

Add your team's conventions and product context to `AGENTS.team.md` in the studio's root. `AGENTS.md` is generated from Studio's own instructions, the modules you have turned on, and your file, so don't edit it directly; ask your agent to run `pnpm studio sync` after you change the sources. Guidance that applies to one design system belongs in that system's own context.
