import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { callModule, useMe } from '@/platform/app/data/files';
import { CONFIG } from '@/platform/app/data/config';
import { Button } from '@/systems/studio/components/button';
import { Input } from '@/systems/studio/components/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/systems/studio/components/dialog';
import { beginSystemCreation, finishSystemCreation, openCreatedSystem } from './creationTransition';

export default function NewSystemButton() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draftName, setDraftName] = useState('');
  if (!import.meta.env.DEV || !me || (CONFIG.usage !== 'personal' && !CONFIG.admins?.includes(me))) return null;
  async function create(form: FormData) {
    if (saving) return;
    setSaving(true); setError('');
    setOpen(false);
    const name = String(form.get('name') ?? '').trim();
    beginSystemCreation(name);
    try {
      const { studioId } = await callModule<{ id: string; studioId: string }>('systems', 'create', { name });
      openCreatedSystem(studioId);
    } catch (e) { finishSystemCreation(); setError((e as Error).message); setSaving(false); setOpen(true); }
  }
  return <><Button onClick={() => { setError(''); setDraftName(''); setOpen(true); }}><HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />New system</Button><Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}><DialogContent><form onSubmit={event => { event.preventDefault(); void create(new FormData(event.currentTarget)); }} className="grid gap-4"><DialogHeader><DialogTitle>New system</DialogTitle><DialogDescription>Create a place for your components, theme, assets, and guidance. Then set it up with your agent.</DialogDescription></DialogHeader><label className="grid gap-1.5 text-sm font-medium">Name<Input name="name" value={draftName} onChange={event => setDraftName(event.target.value)} required maxLength={120} autoFocus placeholder="Your product" /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating' : 'Create'}</Button></DialogFooter></form></DialogContent></Dialog></>;
}
