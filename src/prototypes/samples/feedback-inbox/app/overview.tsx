/** @studio-id 0qd3s4spbfcpbb2j */
// Screen 1 of 3: the overview, where you land. The key numbers are at the top, and each one is a link:
// click it and you're in the feedback table, already filtered to those items. Below are two small
// breakdowns and the newest feedback. Everything is computed from the same data as the table, so it
// changes when you add, edit, or delete.
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/systems/product/components/card';
import AppShell from './_components/AppShell';
import { PriorityBadge, StatusBadge } from './_components/badges';
import { ScreenLink, useScreenPath } from './_components/nav';
import { SOURCES, STATUSES, formatDate, select, showFiltered, useStore, type Filter } from './_components/store';

function Metric({ label, value, hint, filter }: { label: string; value: number; hint: string; filter: Filter }) {
  const navigate = useNavigate();
  const screen = useScreenPath();
  return (
    <button
      type="button"
      onClick={() => { showFiltered(filter); navigate({ to: screen('app/feedback-inbox') as never }); }}
      className="group/metric rounded-square border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
    >
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <ArrowRight className="size-4 opacity-0 transition-opacity group-hover/metric:text-primary group-hover/metric:opacity-100" />
      </div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </button>
  );
}

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[5.5rem_1fr_1.5rem] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="h-2 rounded-full bg-muted"><span className="block h-2 rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} /></span>
          <span className="text-right tabular-nums">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Overview() {
  const { items } = useStore();
  const navigate = useNavigate();
  const screen = useScreenPath();
  const open = items.filter((f) => f.status !== 'resolved');
  const newest = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-8 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Where the feedback stands. Click a number to see the feedback behind it.</p>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Open issues" value={open.length} hint="Not resolved yet" filter={{ status: 'open', priority: null }} />
          <Metric label="New" value={items.filter((f) => f.status === 'new').length} hint="Waiting to be triaged" filter={{ status: 'new', priority: null }} />
          <Metric label="High priority" value={open.filter((f) => f.priority === 'high').length} hint="Open and high priority" filter={{ status: 'open', priority: 'high' }} />
          <Metric label="Resolved" value={items.filter((f) => f.status === 'resolved').length} hint="Closed out" filter={{ status: 'resolved', priority: null }} />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>By status</CardTitle></CardHeader><CardContent><Bars rows={STATUSES.map((s) => ({ label: s.label, count: items.filter((f) => f.status === s.value).length }))} /></CardContent></Card>
          <Card><CardHeader><CardTitle>By source</CardTitle></CardHeader><CardContent><Bars rows={SOURCES.map((s) => ({ label: s.label, count: items.filter((f) => f.source === s.value).length }))} /></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Newest</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {newest.map((f) => (
                <li key={f.id}>
                  <button type="button" className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:text-primary" onClick={() => { select(f.id); navigate({ to: screen('app/feedback-detail') as never }); }}>
                    <span className="flex-1 truncate font-medium">{f.title}</span>
                    <PriorityBadge priority={f.priority} />
                    <StatusBadge status={f.status} />
                    <span className="w-14 text-right text-xs text-muted-foreground">{formatDate(f.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <ScreenLink to="app/feedback-inbox" onClick={() => showFiltered({ status: 'all', priority: null })} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">See all feedback</ScreenLink>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
