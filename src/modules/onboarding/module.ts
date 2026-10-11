import type { ModuleSpec } from '../../platform/core/api.ts';

export default {
  id: 'onboarding',
  label: 'Welcome',
  version: '0.1.0',
  requires: '0.1.0',
  description: 'A first-run welcome that helps people explore their studio and start their first prototype.',
  optional: true,
  lib: false,
  instructions: [
    {
      path: 'skills/use-onboarding/',
      when: 'asks for a first tour of the studio or help getting started after installation',
    },
  ],
} satisfies ModuleSpec;
