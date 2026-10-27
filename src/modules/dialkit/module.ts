import type { ModuleSpec } from '#studio/module';
export default {
  id: 'dialkit', label: 'DialKit', version: '0.2.0', requires: '0.1.2',
  description: 'Bespoke controls for prototype refinement.', optional: true, lib: true,
  dependencies: { dialkit: '^2.1.0', motion: '^14.6.0', typescript: '~6.0.3' },
  optimizeDependencies: ['dialkit', 'motion'],
  settings: { group: 'prototyping', order: 50 },
  instructions: [{ path: 'skills/use-dialkit/', when: 'adds, tunes, saves or removes bespoke DialKit controls on a prototype view' }],
} satisfies ModuleSpec;
