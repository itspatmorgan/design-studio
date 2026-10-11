---
title: Working with your agent
description: Give direction, show what you mean, and review the result.
order: 3
toc: true
---

## What does the agent handle?

Work with your agent in the studio folder. It can operate the entire application based on your prompts: create screens and supporting artifacts, adapt systems, organize files, investigate problems, check changes, and more.

You supply intent and judge the result. Manually taking action in Studio does not automatically start an agent task. If you want the agent to take action, ask it.

## What should I tell it?

Give enough context to make the important choices clear:

| Useful input | Example |
| --- | --- |
| Goal and audience | Help support staff triage incoming feedback. |
| Scope | Start with the inbox and one detail screen. |
| Foundation | Use our Product system. |
| Behavior | Show empty, loading, and failed-save states. |
| References and constraints | Follow this screenshot's density; preserve our navigation. |

You don't need a formal brief for every change. Start with what you know and let the agent ask about unresolved decisions. Ask it to identify assumptions and simulated behavior.

## How do I show the agent what I mean?

Open the studio in your agent app's browser or preview. Use its annotation or element-selection tools to point at the part you want changed, then describe the desired result.

> Make this panel match the spacing of the panel above it. Keep its fields and behavior.

Visual feedback supplies location; your words supply intent. Include the screen or state when the issue depends on an interaction. A screenshot is useful when direct annotation is unavailable.

Codex, Claude Code, and Cursor offer browser tools for visual feedback. Controls vary by app and version: see [Codex's browser](https://developers.openai.com/codex/app/browser), [Claude Desktop's browser](https://code.claude.com/docs/en/desktop), and [Cursor's Design Mode](https://cursor.com/docs/agent/design-mode).

## What can I do directly in Studio?

| In Design Studio | In your agent app |
| --- | --- |
| Try screens and interactions. | Describe a new experience or revision. |
| Create starting items and organize artifacts. | Build behavior and change source files. |
| Edit supported source; draw and annotate on canvases. | Use preview annotations to target feedback. |
| Review systems and adjust permitted settings. | Import a system, add a module, or investigate errors. |

Studio's controls depend on your permissions and enabled modules. Canvas annotations stay with the prototype; ask the agent to use them when requesting changes. They do not automatically change a screen.

For local source controls, see [editing source](/documentation/manual/questions#how-do-i-edit-source).

## How do I review and refine work?

Try the relevant interaction and states, then explain what needs changing and what should stay. Point to an artifact or annotate a specific element.

Ask the agent to preserve the current version when exploring an alternative. A duplicate supports comparison; a commit records a version for later recovery.

Before sharing, ask the agent to check the work and explain any remaining gaps. If something is unclear, ask it to explain the platform or the result in plain language. Detailed platform guidance is available in **Context & Skills**.
