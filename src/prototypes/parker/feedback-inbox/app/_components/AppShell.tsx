// The frame every screen shares: a sidebar and a page. Screens are separate files so each has its
// own address, and this keeps them looking like one product.
import type { ReactNode } from 'react';
import { Flame, Inbox, LayoutDashboard, Map, Sparkles, type LucideIcon } from '@/systems/product/libraries/icons';
import { Avatar, AvatarFallback } from '@/systems/product/components/avatar';
import { Button } from '@/systems/product/components/button';
import { cn } from '#studio/runtime';
import { Link } from '@module/prototypes';
import EchoMark from './EchoMark';
import { useIsOn } from './nav';
import { NO_FILTER, resetData, showFiltered, useStore, type Filter } from './store';

const itemClass = 'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground';

function NavItem({ to, icon: Icon, count, children, onClick }: { to: string; icon: LucideIcon; count?: number; children: ReactNode; onClick?: () => void }) {
  const on = useIsOn(to);
  return (
    <Link to={to} onClick={onClick} className={cn(itemClass, on && 'bg-sidebar-accent font-medium text-sidebar-foreground')}>
      <Icon className={cn('size-4', on ? 'text-primary' : 'text-muted-foreground')} />
      <span className="flex-1">{children}</span>
      {count !== undefined && <span className="font-mono text-xs text-muted-foreground tabular-nums">{count}</span>}
    </Link>
  );
}

// Saved views open the feedback inbox already filtered, the same way the overview's numbers do.
function ViewItem({ icon: Icon, filter, count, children }: { icon: LucideIcon; filter: Filter; count: number; children: ReactNode }) {
  return (
    <Link to="app/feedback-inbox" onClick={() => showFiltered(filter)} className={itemClass}>
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1">{children}</span>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{count}</span>
    </Link>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { items } = useStore();
  const open = items.filter((f) => f.status !== 'resolved');
  return (
    <div className="flex min-h-full bg-background text-foreground">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-3 text-sidebar-foreground">
        <div className="flex h-9 items-center gap-2 px-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"><EchoMark className="size-4" /></span>
          <span className="flex-1 text-sm font-semibold">Echo</span>
        </div>

        <nav className="mt-4 space-y-0.5">
          <NavItem to="app/overview" icon={LayoutDashboard}>Overview</NavItem>
          <NavItem to="app/feedback-inbox" icon={Inbox} count={open.length} onClick={() => showFiltered(NO_FILTER)}>Feedback inbox</NavItem>
        </nav>

        <p className="mt-6 mb-1 px-2 text-xs font-medium text-muted-foreground">Views</p>
        <nav className="space-y-0.5">
          <ViewItem icon={Flame} filter={{ status: 'open', priority: 'high' }} count={open.filter((f) => f.priority === 'high').length}>High priority</ViewItem>
          <ViewItem icon={Sparkles} filter={{ status: 'new', priority: null }} count={items.filter((f) => f.status === 'new').length}>Needs triage</ViewItem>
          <ViewItem icon={Map} filter={{ status: 'planned', priority: null }} count={items.filter((f) => f.status === 'planned').length}>On the roadmap</ViewItem>
        </nav>

        <div className="mt-auto space-y-2">
          <Button variant="ghost" size="xs" className="w-full justify-start text-muted-foreground" onClick={resetData}>Reset sample data</Button>
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <Avatar size="sm"><AvatarFallback>SR</AvatarFallback></Avatar>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">Sam Rivera</p>
              <p className="truncate text-xs text-muted-foreground">Product lead</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
