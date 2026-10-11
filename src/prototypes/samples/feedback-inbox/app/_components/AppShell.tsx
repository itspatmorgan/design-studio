// The frame every screen shares: a top bar and a page. Screens are separate files so each has its
// own address, and this keeps them looking like one product.
import type { ReactNode } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/systems/product/components/avatar';
import { Button } from '@/systems/product/components/button';
import { cn } from '@/lib/utils';
import { ScreenLink, useIsOn } from './nav';
import { NO_FILTER, resetData, showFiltered } from './store';

function NavItem({ to, children, onClick }: { to: string; children: ReactNode; onClick?: () => void }) {
  const on = useIsOn(to);
  return (
    <ScreenLink
      to={to}
      onClick={onClick}
      className={cn('relative flex h-14 items-center gap-1.5 px-1 text-sm font-medium text-muted-foreground hover:text-foreground', on && 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary')}
    >
      {children}
    </ScreenLink>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-8 px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-square bg-primary text-primary-foreground"><MessageSquareText className="size-3.5" /></div>
            <span className="text-sm font-semibold">Echo</span>
          </div>
          <nav className="flex gap-6">
            <NavItem to="app/overview">Overview</NavItem>
            <NavItem to="app/feedback-inbox" onClick={() => showFiltered(NO_FILTER)}>Feedback inbox</NavItem>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={resetData}>Reset sample data</Button>
            <Avatar size="sm"><AvatarFallback>PM</AvatarFallback></Avatar>
          </div>
        </div>
      </header>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
