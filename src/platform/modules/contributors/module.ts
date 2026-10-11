import type { ModuleSpec } from '../../core/api.ts';

export default {
  id: 'contributors',
  label: 'Contributors & Permissions',
  version: '0.1.0',
  requires: '0.1.0',
  description: 'Manage team contributors, Admin access, and permissions to maintain systems.',
  optional: true,
  lib: false,
  section: { key: 'contributors' },
  instructions: [
    {
      path: 'skills/use-contributors/',
      when: 'asks to assign or review team Admins, system maintainers, or contributor permissions',
    },
  ],
} satisfies ModuleSpec;
