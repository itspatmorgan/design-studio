/** @studio-id nmp2gq70vg2mn1tm */
import { useState } from 'react';
import { ArrowUpRight, Check, Inbox } from 'lucide-react';
import { Button } from '@/systems/curation-demo/components/button';
import { Input } from '@/systems/curation-demo/components/input';
import { Badge } from '@/systems/curation-demo/components/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/systems/curation-demo/components/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/systems/curation-demo/components/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/systems/curation-demo/components/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/systems/curation-demo/components/dialog';

type Status = 'Open' | 'Pending' | 'Resolved';
type Ticket = { id: number; subject: string; customer: string; status: Status; message: string };
const initial: Ticket[] = [
  { id: 201, subject: 'Cannot access shared inbox', customer: 'Avery Wilson', status: 'Open', message: 'My invitation worked, but the shared inbox is not showing up. Can you check my permissions?' },
  { id: 202, subject: 'Invoice needs our company name', customer: 'Jordan Park', status: 'Open', message: 'Could you add our company name to the invoice before we send it to finance?' },
  { id: 203, subject: 'Waiting for export confirmation', customer: 'Riley Chen', status: 'Pending', message: 'We are checking whether the latest export includes every customer record.' },
  { id: 204, subject: 'Notification preferences updated', customer: 'Casey Reed', status: 'Resolved', message: 'The email notifications are now working as expected. Thank you!' },
];
const options = ['All statuses', 'Open', 'Pending', 'Resolved'];
const badgeVariant = (status: Status) => status === 'Open' ? 'default' : status === 'Pending' ? 'secondary' : 'outline';

export default function TriageDemo() {
  const [tickets, setTickets] = useState(initial);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = tickets.find(ticket => ticket.id === selectedId);
  const visible = tickets.filter(ticket => (status === 'All statuses' || ticket.status === status) && `${ticket.subject} ${ticket.customer} ${ticket.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6 text-sm">
    <header className="flex items-center gap-3"><Inbox className="size-8 text-primary" /><div><h1 className="text-3xl font-semibold tracking-tight">Ticket triage</h1><p className="text-muted-foreground">A clear inbox. A faster response.</p></div></header>
    <div className="grid gap-4 sm:grid-cols-3">{(['Open', 'Pending', 'Resolved'] as const).map(item => <Card key={item}><CardHeader><CardTitle>{item}</CardTitle><CardDescription>{item === 'Open' ? 'Ready for a response' : item === 'Pending' ? 'Waiting on a follow-up' : 'Helped and closed'}</CardDescription></CardHeader><CardContent className="text-3xl font-semibold">{tickets.filter(ticket => ticket.status === item).length}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Inbox</CardTitle><CardDescription>Find a request, review its details, and resolve it.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2"><Input aria-label="Search tickets" className="sm:max-w-sm" placeholder="Search tickets" value={query} onChange={event => setQuery(event.target.value)} />
        <Select items={options.map(value => ({ value, label: value }))} value={status} onValueChange={value => { if (value) setStatus(value); }}><SelectTrigger aria-label="Ticket status"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectGroup></SelectContent></Select>
        {(query || status !== 'All statuses') && <Button variant="ghost" onClick={() => { setQuery(''); setStatus('All statuses'); }}>Clear filters</Button>}
      </div>
      <Table aria-label="Triage tickets"><TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Details</span></TableHead></TableRow></TableHeader><TableBody>
        {visible.map(ticket => <TableRow key={ticket.id}><TableCell><div className="font-medium">{ticket.subject}</div><p className="text-xs text-muted-foreground">#{ticket.id}</p></TableCell><TableCell>{ticket.customer}</TableCell><TableCell><Badge variant={badgeVariant(ticket.status)}>{ticket.status}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" aria-label={`View ticket ${ticket.id}`} onClick={() => setSelectedId(ticket.id)}><ArrowUpRight /></Button></TableCell></TableRow>)}
        {!visible.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No matching tickets. Try another search or clear the filters.</TableCell></TableRow>}
      </TableBody></Table><p className="text-xs text-muted-foreground" aria-live="polite">{visible.length} of {tickets.length} tickets</p>
    </CardContent></Card>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelectedId(null); }}><DialogContent>{selected && <><DialogHeader><DialogTitle>{selected.subject}</DialogTitle><DialogDescription>#{selected.id} · {selected.customer}</DialogDescription></DialogHeader><div><Badge variant={badgeVariant(selected.status)}>{selected.status}</Badge></div><p className="leading-relaxed">{selected.message}</p><DialogFooter><Button variant="outline" onClick={() => setSelectedId(null)}>Back to inbox</Button>{selected.status !== 'Resolved' && <Button onClick={() => { setTickets(previous => previous.map(ticket => ticket.id === selected.id ? { ...ticket, status: 'Resolved' } : ticket)); setSelectedId(null); }}><Check data-icon="inline-start" />Resolve ticket</Button>}</DialogFooter></>}</DialogContent></Dialog>
  </div>;
}
