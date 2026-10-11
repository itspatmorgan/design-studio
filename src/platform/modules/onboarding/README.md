# Onboarding

Onboarding welcomes designers and product managers after their studio opens. It is optional, enabled in the starter, and independent of the installer or coding tool.

## Behavior

Each contributor’s first local home-page visit opens a skippable dialog over Home: Welcome, Make it yours, Start with a brief, Give your idea shape, Publish your prototype, Share it for feedback, Build together, Extend when you need to, and Start exploring. System and artifact slides appear only when their capabilities are enabled. A visual progress indicator marks the current slide without displaying a numeric count; its accessible label retains the position and slide title.

Each slide communicates one idea through a heading, an illustration, and one explanation. Each tab has a distinct illustration for its point. Systems introduces components and theme, context, and skills. Artifact choices cover diagrams, lo-fi wireframes, hi-fi prototypes, and canvases according to enabled modules. When Documents is enabled, the brief slide explains saving Markdown inside the prototype as lasting agent context. Otherwise it introduces briefing the agent through conversation. Publishing, sharing a viewing link, and collaborating on source are separate slides. Collaboration explains source sharing and contributor scope when that module is enabled. The final slide points to examples already in the studio or starting an idea with the agent, with one action to enter the studio. Its illustration and text reflect the available samples. No particular artifact sequence or system import is required.

**Explore my studio**, **Skip introduction**, Escape, and backdrop dismissal all record completion and close the introduction. It has no rail item, search entry, standalone page, or route. Later visits go directly to the studio. The Manual retains the concepts for later reading.

It does not create work, install dependencies, or register contributors. Its only profile change records whether that contributor has already seen the introduction.

Before the first automatic display for a registered contributor, the local server sets `welcomeDismissed: true` on their profile in `contributors/<key>.json`. It preserves other profile fields and contributor files. Every registered contributor must declare the boolean explicitly when Onboarding is enabled. `false` means the introduction has not been shown; `true` keeps it dismissed. New registration writes `welcomeDismissed: false`. Missing or invalid declarations fail module validation and the display claim; browser fallback does not activate Welcome for an invalid declaration. Only the server-resolved contributor can claim their introduction; the request cannot choose a contributor or file.

Welcome opens automatically once per contributor per studio, even if they leave before finishing or skipping. Restarts, different preview ports, browser changes, and introduction revisions do not reset it. Committing the profile carries that person's progress to other checkouts without dismissing Welcome for teammates. Set that contributor's flag to `false` to show it again after reloading.

Before registration, exploration uses browser completion without changing profiles. Browser fallback is also used if profile persistence is unavailable, and is keyed by contributor identity. It may repeat when browser origins change. The previous studio-level flag and empty marker are ignored and left untouched: neither identifies who saw Welcome. Older profiles must add an explicit `welcomeDismissed: false` or `true` through a reviewable profile edit. Their missing field is a configuration error, not a first-use default.

The module uses the application's `localOnly` extension, so published viewing sites have no onboarding dialog. Disabling or removing the module removes these contributions and retains contributor profile flags and browser fallback. It has no runtime dependency on optional Documentation.

## Ownership

- `module.ts` declares the optional capability.
- `check.ts` requires explicit contributor progress declarations while the module is enabled.
- `app.tsx` adds the local first-visit home contribution without navigation.
- `Welcome.tsx` owns the dialog, steps, dismissal, and text.
- `ConceptPreview.tsx` owns the interactive system and artifact explanations.
- `Illustrations.tsx` adapts lightweight line drawings from the creator’s marketing site to Studio theme colors and human-readable labels.
- `progress.ts` handles the initial display request and browser fallback.
- `server.ts` exposes the same-origin local display claim; `node/progress.js` records the resolved contributor’s profile flag atomically.
- [Use onboarding](skills/use-onboarding/SKILL.md) guides an agent helping a person take their first steps.

Keep installation in the setup entry points and configuration in the platform Configure Studio skill. Onboarding complements both with an introduction after launch. Keep the dialog focused on useful next actions; detailed walkthroughs belong outside the welcome flow.

## Design references

[Linear’s introduction](https://linear.app/learn/intro-to-linear) explains core concepts before deeper workflows. [NN/g’s onboarding guidance](https://www.nngroup.com/articles/onboarding-tutorials/) recommends easy dismissal and progressive disclosure, and cautions against lengthy tours that interrupt work. This introduction adapts those principles into a brief, skippable first-use dialog; it does not claim to reproduce Linear’s current UI.

The narrative follows the platform personas: direct the agent with an idea, make the work fit their product, choose a useful artifact, and share both the result and its source. End with an example to explore and optional paths for collaboration and extending the studio. Follow the platform principle of minimum sufficient guidance for a high-quality outcome. Marketing illustration references are `StudioOwnership.astro` and `StudioFoundation.astro` in the sibling `itspatmorgan.github.io` repository; local adaptations belong to this module and do not import from that repository.
