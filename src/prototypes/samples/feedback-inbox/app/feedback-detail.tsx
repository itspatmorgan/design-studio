/** @studio-id gjmx07ngsdvvnq3s */
// Screen 2 of 3: one piece of feedback. Change its status and priority, add notes, edit it, or delete it.
// The feedback inbox opens this screen with the item it was on. Opened directly (or shown on a canvas), it
// shows the newest item instead of an empty page. DetailScreen takes optional starting state, so the
// files in states/ can show it with the edit dialog or the delete confirmation open.
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/systems/product/components/badge';
import { Button } from '@/systems/product/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/systems/product/components/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/systems/product/components/dialog';
import { Label } from '@/systems/product/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/systems/product/components/select';
import { Separator } from '@/systems/product/components/separator';
import { Textarea } from '@/systems/product/components/textarea';
import AppShell from './_components/AppShell';
import FeedbackForm from './_components/FeedbackForm';
import { PriorityBadge, StatusBadge } from './_components/badges';
import { ScreenLink, useScreenPath } from './_components/nav';
import { PRIORITIES, STATUSES, addNote, formatDate, removeFeedback, updateFeedback, useFeedback, useStore, type Priority, type Status } from './_components/store';

export function DetailScreen({ editing: startEditing = false, deleting: startDeleting = false }: { editing?: boolean; deleting?: boolean }) {
  const { selectedId, items } = useStore();
  const item = useFeedback(selectedId) ?? items[0];
  const [editing, setEditing] = useState(startEditing);
  const [deleting, setDeleting] = useState(startDeleting);
  const [note, setNote] = useState('');
  const navigate = useNavigate();
  const screen = useScreenPath();

  const back = (
    <ScreenLink to="app/feedback-inbox" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Feedback inbox</ScreenLink>
  );

  if (!item) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-8 py-8">
          {back}
          <div className="rounded-square border border-dashed border-border px-6 py-14 text-center">
            <p className="text-sm font-medium">No feedback to show</p>
            <p className="mt-1 text-sm text-muted-foreground">Add some in the feedback inbox, or reset the sample data.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-8 py-8">
        {back}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2"><StatusBadge status={item.status} /><PriorityBadge priority={item.priority} /></div>
            <h1 className="text-xl font-semibold tracking-tight">{item.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{item.customer} · {item.plan} plan · via {item.source} · {formatDate(item.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
            <Button variant="outline" onClick={() => setDeleting(true)}><Trash2 /> Delete</Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 text-sm font-semibold">What they said</h2>
              <p className="text-sm leading-relaxed text-foreground/90">{item.body || 'No details were added.'}</p>
              {item.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{item.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>}
            </section>
            <Separator />
            <section>
              <h2 className="mb-3 text-sm font-semibold">Notes</h2>
              <ul className="mb-4 space-y-3">
                {item.notes.map((n) => (
                  <li key={n.id} className="rounded-square border border-border bg-card px-3 py-2">
                    <p className="text-sm">{n.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.at)}</p>
                  </li>
                ))}
                {item.notes.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
              </ul>
              <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { addNote(item.id, note.trim()); setNote(''); } }}>
                <Label htmlFor="note">Add a note</Label>
                <Textarea id="note" rows={3} value={note} placeholder="What did you find out, or decide?" onChange={(e) => setNote(e.target.value)} />
                <div className="flex justify-end"><Button type="submit" size="sm" disabled={!note.trim()}>Add note</Button></div>
              </form>
            </section>
          </div>

          <Card size="sm" className="self-start">
            <CardHeader><CardTitle>Triage</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select items={STATUSES} value={item.status} onValueChange={(v) => v && updateFeedback(item.id, { status: v as Status })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <Select items={PRIORITIES} value={item.priority} onValueChange={(v) => v && updateFeedback(item.id, { priority: v as Priority })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit feedback</DialogTitle><DialogDescription>Fix a typo or add what you learned.</DialogDescription></DialogHeader>
          <FeedbackForm
            initial={{ title: item.title, body: item.body, customer: item.customer, source: item.source, priority: item.priority }}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={(input) => { updateFeedback(item.id, input); setEditing(false); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete this feedback?</DialogTitle><DialogDescription>“{item.title}” and its notes will be removed. Reset the sample data to get it back.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { removeFeedback(item.id); setDeleting(false); navigate({ to: screen('app/feedback-inbox') as never }); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function Detail() {
  return <DetailScreen />;
}
