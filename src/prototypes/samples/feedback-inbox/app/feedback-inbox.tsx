/** @studio-id 082krbxwqn1j4bhd */
// Screen 2 of 3: the feedback table. Every piece of feedback in a list you can filter, search, and add to,
// with a menu on each row. It has no numbers of its own: those live on the overview, and clicking one
// there brings you here already filtered. Click a row to open it on the next screen.
//
// FeedbackInboxScreen takes optional starting state, so the files in states/ can show it filtered,
// empty, with the panel open, and so on. The default export is the screen as people reach it.
import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { MoreHorizontal, Plus, Search, X } from 'lucide-react';
import { Badge } from '@/systems/product/components/badge';
import { Button } from '@/systems/product/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/systems/product/components/dropdown-menu';
import { Input } from '@/systems/product/components/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/systems/product/components/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/systems/product/components/table';
import { Tabs, TabsList, TabsTrigger } from '@/systems/product/components/tabs';
import AppShell from './_components/AppShell';
import FeedbackForm from './_components/FeedbackForm';
import { PriorityBadge, StatusBadge } from './_components/badges';
import { useScreenPath } from './_components/nav';
import { NO_FILTER, STATUSES, addFeedback, formatDate, matchesFilter, removeFeedback, select, updateFeedback, useStore, type Filter, type Status } from './_components/store';

export type FeedbackInboxStart = {
  filter?: Filter;
  query?: string;
  adding?: boolean;      // the New feedback panel is open
  tried?: boolean;       // ...and Add was pressed with nothing filled in
  menuFor?: string;      // the row menu of this item is open
};

export function FeedbackInboxScreen({ filter: startFilter, query: startQuery = '', adding: startAdding = false, tried = false, menuFor }: FeedbackInboxStart) {
  const { items, filter: asked } = useStore();
  // Starts with what the overview asked for (or what a state file says), then the person takes over.
  const [filter, setFilter] = useState<Filter>(startFilter ?? asked);
  const [query, setQuery] = useState(startQuery);
  const [adding, setAdding] = useState(startAdding);
  const navigate = useNavigate();
  const screen = useScreenPath();

  const open = (id: string) => { select(id); navigate({ to: screen('app/feedback-detail') as never }); };
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((f) => matchesFilter(f, filter) && (!q || `${f.title} ${f.customer} ${f.tags.join(' ')}`.toLowerCase().includes(q)));
  }, [items, filter, query]);
  // Tabs name one status; "open issues" and "high priority" aren't tabs, so none is selected and the bar below says what's showing.
  const tab = filter.status === 'open' || filter.priority ? '' : filter.status;
  const narrowed = filter.status === 'open' || filter.priority !== null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-8 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Feedback inbox</h1>
            <p className="mt-1 text-sm text-muted-foreground">Everything customers have told us, newest first.</p>
          </div>
          <Button onClick={() => setAdding(true)}><Plus /> New feedback</Button>
        </header>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => setFilter({ status: v as Status | 'all', priority: null })}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {STATUSES.map((s) => <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search feedback" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        {narrowed && (
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            Showing
            <Badge variant="secondary">Open issues</Badge>
            {filter.priority && <Badge variant="secondary">High priority</Badge>}
            <Button variant="ghost" size="xs" onClick={() => setFilter(NO_FILTER)}><X /> Clear</Button>
          </div>
        )}

        <div className="rounded-square border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Feedback</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((f) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => open(f.id)}>
                  <TableCell className="font-medium">{f.title}</TableCell>
                  <TableCell className="text-muted-foreground">{f.customer}<span className="text-xs"> · {f.source}</span></TableCell>
                  <TableCell><PriorityBadge priority={f.priority} /></TableCell>
                  <TableCell><StatusBadge status={f.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(f.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu defaultOpen={f.id === menuFor}>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${f.title}`} />}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => open(f.id)}>Open</DropdownMenuItem>
                        <DropdownMenuItem disabled={f.status === 'resolved'} onClick={() => updateFeedback(f.id, { status: 'resolved' })}>Mark resolved</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => removeFeedback(f.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {shown.length === 0 && (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium">{items.length === 0 ? 'No feedback yet' : 'Nothing matches'}</p>
              <p className="mt-1 text-sm text-muted-foreground">{items.length === 0 ? 'Add the first piece, or reset the sample data.' : 'Try another status or search.'}</p>
            </div>
          )}
        </div>
      </div>

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New feedback</SheetTitle>
            <SheetDescription>Capture what you heard. You can triage it from the feedback inbox.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <FeedbackForm showErrors={tried} submitLabel="Add feedback" onCancel={() => setAdding(false)} onSubmit={(input) => { addFeedback(input); setAdding(false); }} />
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

export default function FeedbackInbox() {
  return <FeedbackInboxScreen />;
}
