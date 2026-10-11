import { useCallback, useState } from 'react';
import { HeadContent, Link, Outlet, useRouterState } from '@tanstack/react-router';
import MainNav from '@/platform/app/shell/MainNav';
import { TooltipProvider } from '@/platform/systems/studio/components/tooltip';
import { Toaster } from '@/platform/systems/studio/components/toast';
import { CommandPaletteProvider } from '@/platform/app/shell/CommandPalette';
import { MODULES } from '@/platform/app/data/modules';
import {
  SectionNavContext,
  SectionNavPresenceContext,
  useColorMode,
  useSectionNav,
} from '@/platform/app/shell/appPrefs';

import NavigationProgress from './NavigationProgress';

// The root route's layout: the rail, the current page, and the ⌘K palette.
export default function App() {
  const { colorMode, toggleColorMode } = useColorMode();
  const sectionNav = useSectionNav();
  // How many section navigations are on the page (each SectionNav registers itself), so the rail
  // offers its hide/show toggle exactly when there is one.
  const [navs, setNavs] = useState(0);
  const registerNav = useCallback((present: boolean) => setNavs(n => n + (present ? 1 : -1)), []);
  // A standalone item (a standalone section item, /examples/<id>) on the deployed site fills the window like an app: no rail,
  // no navigation. (Locally it keeps them, so you can still edit it.)
  const standaloneApp = useRouterState({
    select: s =>
      !import.meta.env.DEV &&
      MODULES.some(m => m.section?.standalone && s.location.pathname.startsWith(`/${m.section.key}/`)),
  });

  return (
    <TooltipProvider>
      <HeadContent />
      <SectionNavContext.Provider value={sectionNav.open}>
        <SectionNavPresenceContext.Provider value={registerNav}>
          <CommandPaletteProvider>
            <div className='flex h-dvh overflow-hidden'>
              {!standaloneApp && (
                <MainNav
                  colorMode={colorMode}
                  onToggleColorMode={toggleColorMode}
                  sectionNav={navs > 0 ? sectionNav : null}
                />
              )}
              <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-contain'>
                <Outlet />
              </div>
            </div>
          </CommandPaletteProvider>
        </SectionNavPresenceContext.Provider>
      </SectionNavContext.Provider>
      <NavigationProgress />
      <Toaster />
    </TooltipProvider>
  );
}

// Unknown URLs, prototypes, and views.
export function NotFound() {
  return (
    <div className='space-y-2 p-8'>
      <p className='text-sm font-medium text-foreground'>Page not found</p>
      <p className='text-sm text-muted-foreground'>
        There's nothing at this address.{' '}
        <Link to='/' className='text-primary hover:underline'>
          View all prototypes
        </Link>
      </p>
      {/* Archived work isn't on the deployed site (src/platform/core/archive.ts), and nothing there says which address it was. */}
      {!import.meta.env.DEV && (
        <p className='text-sm text-muted-foreground'>
          If it was archived, it isn't on the deployed site. Run the sandbox locally to open it.
        </p>
      )}
    </div>
  );
}
