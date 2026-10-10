/** @studio-id c9tgy7px512tc8h2 */
import { useState } from 'react';
import { Headphones, ArrowUpRight, Check } from 'lucide-react';
import { Button } from '@/systems/curation-test/components/button';
import { Input } from '@/systems/curation-test/components/input';
import { Badge } from '@/systems/curation-test/components/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/systems/curation-test/components/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/systems/curation-test/components/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/systems/curation-test/components/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/systems/curation-test/components/dialog';

type Ticket = { id: number; subject: string; customer: string; status: 'Open' | 'Pending' | 'Resolved'; priority: 'Normal' | 'Urgent'; time: string; message: string };
const initialTickets: Ticket[] = [
  { id: 1042, subject: 'Unable to sign in', customer: 'Alex Rivera', status: 'Open', priority: 'Urgent', time: '5m ago', message: 'I reset my password this morning, but I still cannot sign in. Could you help me get back into my account?' },
  { id: 1041, subject: 'Question about my invoice', customer: 'Morgan Lee', status: 'Open', priority: 'Normal', time: '12m ago', message: 'Could you explain the additional seats on this month’s invoice?' },
  { id: 1040, subject: 'Invite link has expired', customer: 'Sam Chen', status: 'Pending', priority: 'Normal', time: '24m ago', message: 'My teammate’s invite expired before they could accept it. We are waiting for a new link.' },
  { id: 1039, subject: 'Export is missing a column', customer: 'Taylor Brooks', status: 'Open', priority: 'Normal', time: '38m ago', message: 'The customer name column is missing from my latest CSV export.' },
  { id: 1038, subject: 'Update billing contact', customer: 'Jamie Patel', status: 'Resolved', priority: 'Normal', time: '1h ago', message: 'Thank you for updating our billing contact. Everything looks correct now.' },
  { id: 1037, subject: 'How do I create a shared view?', customer: 'Casey Jordan', status: 'Pending', priority: 'Normal', time: '2h ago', message: 'I would like everyone on my team to see the same saved view. What is the best way to set that up?' },
];
const statuses = ['All statuses', 'Open', 'Pending', 'Resolved'];
function Status({ status }: { status: Ticket['status'] }) { return <Badge variant={status === 'Open' ? 'default' : status === 'Pending' ? 'secondary' : 'outline'}>{status}</Badge>; }
export default function SupportDashboard() {
  const [tickets, setTickets] = useState(initialTickets);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All statuses');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = tickets.find(ticket => ticket.id === selectedId);
  const visible = tickets.filter(ticket => (filter === 'All statuses' || ticket.status === filter) && `${ticket.id} ${ticket.subject} ${ticket.customer}`.toLowerCase().includes(query.toLowerCase()));
  function resolveTicket() { setTickets(current => current.map(ticket => ticket.id === selectedId ? { ...ticket, status: 'Resolved' } : ticket)); setSelectedId(null); }
  return <div className="mx-auto max-w-5xl p-6 sm:p-8">
    <header className="mb-8 flex items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Headphones className="size-4" /> Support workspace</div><h1 className="text-3xl font-semibold tracking-tight">Customer support</h1><p className="mt-2 text-sm text-muted-foreground">A clear view of what needs your attention.</p></div>
      <Badge variant="outline">Curation Test</Badge>
    </header>
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      {(['Open', 'Pending', 'Resolved'] as const).map(status => <Card key={status}><CardHeader><CardDescription>{status === 'Open' ? 'Needs a response' : status === 'Pending' ? 'Waiting on a reply' : 'Taken care of'}</CardDescription><CardTitle>{status} tickets</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{tickets.filter(ticket => ticket.status === status).length}</CardContent></Card>)}
    </div>
    <Card><CardHeader><CardTitle>Ticket inbox</CardTitle><CardDescription>Find a request and open it to review the details.</CardDescription></CardHeader><CardContent>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><label className="mb-2 block text-sm font-medium" htmlFor="ticket-search">Search tickets</label><Input id="ticket-search" placeholder="Search by subject, customer, or ticket number" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div><span id="status-label" className="mb-2 block text-sm font-medium">Status</span><Select items={statuses.map(status => ({ label: status, value: status }))} value={filter} onValueChange={value => setFilter(value ?? 'All statuses')}><SelectTrigger aria-labelledby="status-label"><SelectValue /></SelectTrigger><SelectContent alignItemWithTrigger={false}>{statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
        {(query || filter !== 'All statuses') && <Button variant="ghost" onClick={() => { setQuery(''); setFilter('All statuses'); }}>Clear filters</Button>}
      </div>
      <Table aria-label="Support tickets"><TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Received</TableHead><TableHead><span className="sr-only">Open ticket</span></TableHead></TableRow></TableHeader><TableBody>
        {visible.map(ticket => <TableRow key={ticket.id}><TableCell><div className="font-medium">{ticket.subject}</div><div className="mt-1 text-xs text-muted-foreground">#{ticket.id} · {ticket.customer}</div></TableCell><TableCell><Status status={ticket.status} /></TableCell><TableCell>{ticket.priority === 'Urgent' ? <Badge variant="destructive">Urgent</Badge> : <span className="text-muted-foreground">Normal</span>}</TableCell><TableCell className="text-muted-foreground">{ticket.time}</TableCell><TableCell><Button variant="ghost" size="icon" aria-label={`Open ticket ${ticket.id}`} onClick={() => setSelectedId(ticket.id)}><ArrowUpRight /></Button></TableCell></TableRow>)}
        {visible.length === 0 && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No tickets match your search. Try another term or clear the filters.</TableCell></TableRow>}
      </TableBody></Table>
      <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">{visible.length} of {tickets.length} tickets</p>
    </CardContent></Card>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelectedId(null); }}><DialogContent className="sm:max-w-xl">{selected && <><DialogHeader><DialogTitle>{selected.subject}</DialogTitle><DialogDescription>#{selected.id} · {selected.customer} · {selected.time}</DialogDescription></DialogHeader><div className="flex gap-2"><Status status={selected.status} />{selected.priority === 'Urgent' && <Badge variant="destructive">Urgent</Badge>}</div><p className="py-4 text-base leading-relaxed">{selected.message}</p><DialogFooter><Button variant="outline" onClick={() => setSelectedId(null)}>Back to inbox</Button>{selected.status !== 'Resolved' && <Button onClick={resolveTicket}><Check data-icon="inline-start" /> Mark resolved</Button>}</DialogFooter></>}</DialogContent></Dialog>
  </div>;
}
