import type { ModuleSpec } from '#studio/module';
export default {
  id: 'dialkit-lab', label: 'DialKit Lab', version: '0.1.0', requires: '0.1.2',
  description: 'Isolated prototype tuning experiment.', optional: true, lib: true,
  dependencies: { dialkit: '^2.1.0', motion: '^14.6.0' },
  instructions: [{ path: 'skills/use-dialkit-lab/', when: 'tests the experimental DialKit prototype inspector' }],
} satisfies ModuleSpec;
