import { HugeiconsIcon } from '@hugeicons/react';
import {
  Moon02Icon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Search01Icon,
  Sun01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/systems/studio/components/tooltip';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Link, useRouterState, type LinkProps } from '@tanstack/react-router';
import { useOpenPalette } from '@/platform/app/shell/paletteContext';
import { Logo } from '@/platform/app/shell/Logo';
import { inSection, moduleApps, sectionPath } from '@/platform/app/modules';
import { APP_NAME } from '@/platform/app/data/config';

const railShape =
  'flex size-8 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring';
const railButton = cn(
  railShape,
  'text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/5 hover:text-sidebar-accent-foreground',
);

// One square button on the rail: a link with a tooltip to its right.
type RailLinkProps = { to: LinkProps['to']; label: string; active?: boolean; children: ReactNode; className?: string };

function RailLink({ to, label, active, children, className }: RailLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            to={to}
            aria-label={label}
            activeOptions={{ exact: true }}
            aria-current={active ? 'page' : undefined}
            className={cn(
              railShape,
              active
                ? 'bg-sidebar-foreground/10 text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-foreground/5 hover:text-sidebar-accent-foreground',
              className,
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side='right'>{label}</TooltipContent>
    </Tooltip>
  );
}

// One square button on the rail that runs an action, like opening search.
function RailButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<button type='button' onClick={onClick} aria-label={label} className={railButton} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side='right'>{label}</TooltipContent>
    </Tooltip>
  );
}

// Main navigation: a narrow icon rail, visible on every page.
// Top: the logo (the front page), search, Prototypes, Systems, and Documentation. Bottom: navigation
// visibility and the color mode toggle. Module entries come from
// src/modules/<id>/app.tsx, so the rail has exactly the ones installed and on. sectionNav is set only
// while a page has a section navigation (shell/nav/), to show or hide it.
type MainNavProps = {
  colorMode: string;
  onToggleColorMode: () => void;
  sectionNav: { open: boolean; toggle: () => void } | null;
};

export default function MainNav({ colorMode, onToggleColorMode, sectionNav }: MainNavProps) {
  const openPalette = useOpenPalette();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const moduleLinks = (place: 'top' | 'bottom') =>
    moduleApps
      .filter(({ app }) => app.rail === place)
      .map(({ spec, app }) => (
        <RailLink
          key={spec.id}
          to={sectionPath(spec) as never}
          label={app.navLabel ?? spec.label}
          active={inSection(spec, pathname)}
        >
          <HugeiconsIcon icon={app.icon} size={16} />
        </RailLink>
      ));
  return (
    <nav
      aria-label='Main'
      data-testid='main-nav'
      className='flex w-12 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3'
    >
      <RailLink to='/' label={APP_NAME} className='active:scale-95'>
        <Logo className='h-3.5 w-auto' />
      </RailLink>
      <RailButton label='Search (⌘K)' onClick={openPalette}>
        <HugeiconsIcon icon={Search01Icon} size={16} />
      </RailButton>
      <div className='h-2' />
      {/* With many modules the top group scrolls, so none is ever out of reach. */}
      <div className='flex min-h-0 flex-col items-center gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {moduleLinks('top')}
      </div>

      <div className='mt-auto' />
      {sectionNav && (
        <RailButton label={`${sectionNav.open ? 'Hide' : 'Show'} navigation (⌘;)`} onClick={sectionNav.toggle}>
          <HugeiconsIcon icon={sectionNav.open ? PanelLeftCloseIcon : PanelLeftOpenIcon} size={16} />
        </RailButton>
      )}
      {moduleLinks('bottom')}
      {import.meta.env.DEV && (
        <RailLink to={'/settings' as never} label='Studio settings' active={pathname === '/settings'}>
          <HugeiconsIcon icon={Settings01Icon} size={16} />
        </RailLink>
      )}
      <RailButton label={colorMode === 'dark' ? 'Light mode' : 'Dark mode'} onClick={onToggleColorMode}>
        <HugeiconsIcon icon={colorMode === 'dark' ? Sun01Icon : Moon02Icon} size={16} />
      </RailButton>
    </nav>
  );
}
