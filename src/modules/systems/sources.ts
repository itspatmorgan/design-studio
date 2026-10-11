// Source paths derive from system declarations and their discovered IDs.
// This shared adapter works in Node and browser code.
import type { DocsMode, SystemSpec } from './spec.ts';

export type { DocsMode };

export type SystemSource = {
  label: string;
  dir: string; // the folder it lives in, like "src/systems/product/"
  components: string; // where its components are, without a trailing "/"
  theme: string; // the CSS file that sets its variables
  scope: { light: string; dark: string }; // the selectors that hold its values in that file
  docs: DocsMode;
  origin: 'shadcn' | null; // where its components come from, so each page can link to their docs
};

// A prototype system's parts, from its system.ts and the folder it was found in.
export const sourceOf = (id: string, spec: SystemSpec): SystemSource => ({
  label: spec.label,
  dir: `src/systems/${id}/`,
  components: `src/systems/${id}/components`,
  theme: `src/systems/${id}/styles/theme.css`,
  scope: { light: `.${spec.themeClass}`, dark: `.${spec.themeClass}[data-color-mode="dark"]` },
  docs: spec.docs,
  origin: spec.origin,
});

// The app's own system: stock shadcn/ui components, themed on the page itself (:root and .dark).
export const platformSourceOf = (id: string, spec: SystemSpec): SystemSource => ({
  ...sourceOf(id, spec),
  scope: { light: ':root', dark: '.dark' },
});

// shadcn/ui's page for a component, from its file's name ("input-group" → .../base/input-group).
// The name is checked, since it goes into a link.
export const shadcnDocsUrl = (stem: string) =>
  /^[a-z0-9-]+$/.test(stem) ? `https://ui.shadcn.com/docs/components/base/${stem}` : null;
