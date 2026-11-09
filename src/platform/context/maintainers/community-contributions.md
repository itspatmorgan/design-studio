---
title: Community contributions
description: How maintainers assess, adapt, release, and acknowledge a community contribution to upstream Design Studio.
toc: true
---

People propose changes through an issue, as [Contributing](../../../../CONTRIBUTING.md) describes. This guide is for upstream maintainers and the agents working for them. The maintainer decides whether to accept a contribution, approves changes to the contributor's design, and approves anything sent to the contributor or posted publicly. An agent may prepare each of these; it does not send or post them on its own.

## Assess the proposal

Judge the idea before the code. Read [Principles](../principles.md) and [Personas](../personas.md): does it solve a real problem for the people Design Studio serves, and does it fit the platform's direction?

Find the owner (platform, module, or system) and the existing pattern the change should follow. Prefer extending a current capability over adding a parallel surface, implementation, or dependency.

Decide one of three outcomes:

- **Accept**: it meets the standard as proposed.
- **Accept with changes**: the idea is right and the maintainer brings the implementation to standard. Use this rather than a long review round when the remaining work is about platform fit, which a first-time contributor cannot be expected to know.
- **Decline**: explain why in terms of principles or fit, suggest an alternative such as a team module or a discussion, and close the issue as not planned.

## Bring the work in

A contributor may be unable to open a pull request. Fetch their branch, apply their commits to a maintainer branch with authorship intact, and open the pull request from there. Add maintainer changes as separate commits on top.

Describe the source issue and branch in plain text, without linking the issue or mentioning the contributor. They hear once, with the outcome, rather than through every intermediate review step.

## Bring it to standard

Review the contribution as code the project will own:

- Use it the way people will: each input it touches (mouse, trackpad, touch, keyboard) and each supported browser, including Safari.
- Match the patterns and visual language of comparable features, so it reads as part of the platform.
- Keep ownership boundaries explicit, with an opt-in where only one owner needs the behavior, and update tests, owner READMEs, context, skills, and the Manual it affects.
- Verify against the contributor's own examples and checks. Keep added sample content only when it serves the starter.

Record each change to the contributor's design and its reason; the closing reply needs them.

## Merge and release

Merge with a merge commit so the contributor's commits keep their authorship; a squash merge would reassign them. Add a changelog line ending "Thanks @handle." so the credit reaches the release notes. Release through [Releasing](releasing.md); a self-contained contribution can ship as its own patch release.

## Close the loop

When the release is published, reply on the contributor's issue and close it as completed. Keep the reply short: thanks, links to the release and pull request, and a plain list of what changed from their proposal and why.

A reply an agent posts for the maintainer begins with a label line, such as "_Posted by Claude on behalf of Patrick._", so the contributor knows who wrote it.

Public acknowledgement, such as a social post with a demo, belongs to the maintainer. An agent may record a demo and draft copy but does not post or tag anyone.
