// The top of a section's navigation, in pieces that compose:
//   <NavHeader>            the block itself (padding, and whatever you put in it)
//     <NavTitle>…</NavTitle>       the section's name, with optional actions at the right
//     <NavTabs label="…">…</NavTabs>   a row of tabs to switch within the section; each tab is a
//                                       Link with className={navTabClass(active)}
//   </NavHeader>
// A section with more to show (a prototype's title, editable, with its menu) builds its own title
// row and keeps the rest.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function NavHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('shrink-0 px-2 pt-3', className)}>{children}</div>;
}

export function NavTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn('flex min-h-8 items-center px-3', actions && '-mr-2 gap-0.5')}>
      <h2 className='min-w-0 flex-1 truncate text-sm font-semibold leading-tight'>{children}</h2>
      {actions}
    </div>
  );
}

export function NavTabs({ label, children, wrap = false }: { label: string; children: ReactNode; wrap?: boolean }) {
  return (
    <nav aria-label={label} className={cn('mt-1 flex gap-1 px-1', wrap && 'flex-wrap [&>a]:shrink-0')}>
      {children}
    </nav>
  );
}

// How a tab looks: small text, the open one raised.
export const navTabClass = (active: boolean) =>
  cn(
    'rounded-md px-2 py-1 text-xs',
    active
      ? 'bg-sidebar-foreground/10 font-medium text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-foreground/5 hover:text-sidebar-accent-foreground',
  );
