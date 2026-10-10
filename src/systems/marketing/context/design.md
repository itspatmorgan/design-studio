---
title: Marketing design
description: Composition and copy conventions for Marketing prototypes.
---

- Give each section one clear purpose. Keep only the copy needed to support it.
- Prefer a simple single-column sequence: introduction, demonstration, installation, usage, and reference.
- Do not use eyebrow labels or small all-caps text. Use sentence-case headings and ordinary body text.
- Separate and group sections with whitespace. Use borders for a functional container or control, not as decorative section dividers.
- Keep marketing projects self-contained. Screenshots and recordings may demonstrate another prototype, but do not link visitors into that prototype.
- Show real product behavior. Label captured screenshots as previews; do not present them as live interfaces.
- Link to the repository and provide verified installation commands. Do not substitute a copyable setup prompt for installation instructions.
- Setup starts with GitHub’s “Use this template” action. Instruct people to clone their own generated repository; never instruct them to clone the starter directly.
- Use a plain anchor with Marketing’s `buttonVariants({ variant: 'link', size: 'sm' })` and a trailing Lucide ArrowUpRight icon for resource links. Keep typography and hover treatment consistent across setup, prerequisites, and reference links. Do not add separate underline styles or text arrows.
- If a page has human and agent modes, use the same facts and setup instructions in both. The agent mode presents concise Markdown.
- Use factual claims. Do not invent testimonials, customer logos, usage metrics, or pricing.
