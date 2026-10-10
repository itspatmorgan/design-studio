# Curation Test

A design system for prototypes assigned to `curation-test`.

- `AGENTS.md` selects relevant context and skills.
- `context/` holds shared product and design knowledge.
- `skills/` holds task procedures when this system needs them.
- `components/` and `styles/theme.css` provide the interface toolkit.
- `assets/`, when needed, holds this system's fonts, icons, logos, and shared imagery. Package assets remain explicit dependencies.
- `system.ts` declares the system; `intro.tsx` describes it in the app.

Add context and skills only when needed. This system’s UI reads its original Context and Skills files alongside Theme and Components. See the [Systems module](../../modules/systems/README.md) for the authoring contract.

## Current foundations

See [saved curation decisions](context/curation.md). The shadcn preset uses Base UI, Nova, blue accents, Manrope, and small corners. Manrope is provided by `@fontsource-variable/manrope`; icons will use the installed `lucide-react` package. Foundations were accepted. The seven-component kit and support dashboard are awaiting review.
