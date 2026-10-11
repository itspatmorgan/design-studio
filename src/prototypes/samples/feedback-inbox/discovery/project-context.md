---
studioId: 9jmjq17bwtce5tq6
title: Project Context
description: The problem, working assumptions, and explorations behind the feedback tracker.
toc: true
---

## The problem

Customer feedback is scattered across email, chat, interviews, surveys, and support tickets. The team needs one place to capture it, review recurring problems, and track what happens next.

## Who it's for

- **Luis, support lead:** capture feedback quickly.
- **Priya, product manager:** triage new items and track planned work.
- **Maya, product designer:** find patterns worth exploring.

## Working assumptions

- Items move through **New, Triaged, Planned, and Resolved**.
- Status and priority help the team decide what to address.
- Notes stay with the feedback item so its history stays together.

## Open questions

- Where should filtering live?
- When should customers hear back?
- How long should resolved feedback remain visible?

## Explore the idea

The feedback flow models the review cycle. Its source is shared with the Breadboard canvas.

![Feedback review flow](feedback-flow.mermaid)

The low-fidelity inbox lets us discuss layout while keeping the screen's behavior.

![Lo-fi inbox](lofi-inbox.tsx)

Breadboard compares the live diagram with an independent, editable sketch. Open the canvas to rearrange or annotate it.

![Breadboard exploration](breadboard.excalidraw)
