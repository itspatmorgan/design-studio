import type { ModuleSpec } from '../../platform/core/api.ts';

// Systems: the design systems prototypes are built with (/systems), in src/systems/.
export default {
  optional: false,
  lib: false,
  instructions: [
    { path: 'skills/setup-design-system/', when: 'asks to curate, assess, import, replace, or adapt a design system' },
    { path: 'skills/document-component/', when: 'asks to import or document a system component' },
  ],
  id: 'systems',
  label: 'Systems',
  version: '0.1.0',
  description: 'Theme, components, assets, context, and skills for prototypes.',
  section: { key: 'systems', folder: 'src/systems', policy: 'open' },
} satisfies ModuleSpec;
