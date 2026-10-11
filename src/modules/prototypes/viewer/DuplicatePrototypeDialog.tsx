import { useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { duplicatePrototype } from '@/platform/app/data/files';
import { findPrototype, prototypeLink, setManifest } from '@/platform/app/data/manifest';
import type { PrototypeInfo } from '@/platform/app/data/types';
import { ACTIVE_PROTOTYPE_SYSTEMS } from '@/modules/systems/data/systems';
import { Button } from '@/systems/studio/components/button';
import { Input } from '@/systems/studio/components/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/systems/studio/components/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/systems/studio/components/dialog';

export const systemLabel = (id: string | null) =>
  id === null ? 'No system — custom styling' : (ACTIVE_PROTOTYPE_SYSTEMS[id]?.label ?? id);

type Props = { proto: PrototypeInfo; open: boolean; onOpenChange: (open: boolean) => void };
export default function DuplicatePrototypeDialog({ proto, open, onOpenChange }: Props) {
  const router = useRouter();
  const navigate = useNavigate();
  const [title, setTitle] = useState(`${proto.title} copy`);
  const [system, setSystem] = useState(proto.system ?? '__none');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = system === '__none' ? null : system;
  const rebuild = target !== proto.system;

  async function submit() {
    if (rebuild && !confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await duplicatePrototype(proto, { title, system: target });
      setManifest(result.manifest);
      await router.invalidate();
      onOpenChange(false);
      const copied = findPrototype(result.manifest, proto.contributorKey, result.prototype);
      if (!copied) throw new Error('The copy is missing from the inventory.');
      await navigate(prototypeLink(copied));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent>
        <form action={submit} className='grid gap-4'>
          <DialogHeader>
            <DialogTitle>{confirming ? 'Create a copy for a system rebuild?' : 'Duplicate prototype'}</DialogTitle>
            <DialogDescription>
              {confirming
                ? 'The original prototype stays unchanged. Rebuilding the copy requires your coding agent.'
                : 'Create a separate copy to explore another direction.'}
            </DialogDescription>
          </DialogHeader>
          {confirming ? (
            <div className='grid gap-3 text-sm'>
              <p>
                <strong>{title}</strong>
                <br />
                {systemLabel(proto.system)} → {systemLabel(target)}
              </p>
              <p>
                Components and styles usually do not translate directly. Your agent will need to reconstruct the copy,
                and some details or behavior may change.
              </p>
              <p>
                The copy keeps its current system until the rebuild is complete. You can copy the rebuild instructions
                from its sidebar.
              </p>
            </div>
          ) : (
            <>
              <label className='grid gap-1.5 text-sm font-medium'>
                Title
                <Input value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
              </label>
              <div className='grid gap-1.5'>
                <label id='duplicate-system-label' className='text-sm font-medium'>
                  System
                </label>
                <Select
                  items={[
                    ...Object.entries(ACTIVE_PROTOTYPE_SYSTEMS).map(([value, spec]) => ({ value, label: spec.label })),
                    { value: '__none', label: 'No system — custom styling' },
                  ]}
                  value={system}
                  onValueChange={value => {
                    if (value) setSystem(value);
                  }}
                >
                  <SelectTrigger aria-labelledby='duplicate-system-label' className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVE_PROTOTYPE_SYSTEMS).map(([id, spec]) => (
                      <SelectItem key={id} value={id}>
                        {spec.label}
                      </SelectItem>
                    ))}
                    <SelectItem value='__none'>No system — custom styling</SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-xs text-muted-foreground'>
                  {rebuild
                    ? 'Choosing a different system creates a copy for your agent to rebuild. It does not convert the existing code.'
                    : 'Copies the existing artifacts, components, and styles.'}
                </p>
              </div>
            </>
          )}
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={saving}
              onClick={() => (confirming ? setConfirming(false) : onOpenChange(false))}
            >
              {confirming ? 'Back' : 'Cancel'}
            </Button>
            <Button type='submit' disabled={saving || !title.trim()}>
              {saving ? 'Creating' : confirming ? 'Create rebuild copy' : rebuild ? 'Continue' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
