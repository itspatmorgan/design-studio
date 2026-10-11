import { Home01Icon } from '@hugeicons/core-free-icons';
import type { ModuleApp } from '@/platform/core/api';
import Welcome from './Welcome';

export default {
  icon: Home01Icon,
  rail: 'none',
  order: 10,
  localOnly: true,
  homeOrder: { local: 0 },
  overview: Welcome,
} satisfies ModuleApp;
