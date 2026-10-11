// Start personal. Switch to team use in Studio settings when you are ready to collaborate.
// Installed capabilities and system registration are explicit. Run `pnpm check` to validate them.
import type { StudioConfig } from './src/platform/core/config.ts';

export default {
  name: 'Design Studio',
  usage: 'personal',
  tagline: "A prototype sandbox for you and your team",
  modules: {
    canvas: true,
    diagrams: true,
    document: true,
    documentation: true,
    prototypes: true,
    systems: true,
    text: true,
    view: true,
    onboarding: true,
    contributors: true,
  },
  systems: ["studio", "product", "marketing"],
  systemMaintainers: { "4f3m7z08hk5a0k53": [], "v4576ka1mbpbqdp1": [] },
  defaultSystem: "4f3m7z08hk5a0k53",   // the system selected at creation; each prototype persists an explicit systemId
  admins: ["01ketxwns61brr7r"],
} satisfies StudioConfig;
