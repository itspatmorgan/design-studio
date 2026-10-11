import { createRoute } from '@tanstack/react-router';
import { UserGroupIcon } from '@hugeicons/core-free-icons';
import { APP_NAME, CONFIG, type ModuleApp, type PaletteContext } from '#studio/module';
import { CommandItem } from '@/platform/systems/studio/components/command';
import Contributors from './Contributors';

function Places({ go }: PaletteContext) {
  return (
    <CommandItem value='contributors permissions team access' onSelect={() => go({ to: '/contributors' } as never)}>
      Contributors
    </CommandItem>
  );
}

export default {
  icon: UserGroupIcon,
  navLabel: 'Contributors',
  rail: CONFIG.usage === 'team' ? 'bottom' : 'none',
  order: 40,
  localOnly: true,
  routes: root =>
    CONFIG.usage === 'team'
      ? [
          createRoute({
            getParentRoute: () => root,
            path: 'contributors',
            head: () => ({ meta: [{ title: `Contributors — ${APP_NAME}` }] }),
            component: Contributors,
          }),
        ]
      : [],
  places: CONFIG.usage === 'team' ? Places : undefined,
} satisfies ModuleApp;
