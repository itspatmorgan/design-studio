import type { ModuleSpec } from '#studio/module';

// Systems: the design systems prototypes are built with (/systems), in src/systems/ (and Studio's own interface system in src/platform/systems/).
export default {
  optional: false,
  settings: { group: 'systems', order: 0 },
  lib: false,
  instructions: [
    { path: 'skills/setup-design-system/', when: 'asks to curate, assess, import, replace, or adapt a design system' },
    { path: 'skills/document-component/', when: 'asks to import or document a system component' },
  ],
  id: 'systems',
  label: 'Systems',
  version: '0.1.0',
  requires: '0.2.0',
  description: 'Theme, components, assets, context, and skills for prototypes.',
  section: { key: 'systems', folder: 'src/systems', policy: 'open' },
} satisfies ModuleSpec;
