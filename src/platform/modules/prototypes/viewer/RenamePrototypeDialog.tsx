// Edits the title; saving also renames an owned prototype's folder and URL.
import { useState } from 'react';
import { useRenamePrototype } from '@/platform/modules/prototypes/viewer/useRenamePrototype';
import { formatDate } from '@/platform/app/data/manifest';
import type { PrototypeInfo } from '@/platform/app/data/types';
import { MODULES } from '@/platform/app/data/modules';
import { policyFor } from '@/platform/core/permissions';
import { Button } from '@/platform/systems/studio/components/button';
import { Input } from '@/platform/systems/studio/components/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/platform/systems/studio/components/dialog';

type Props = { proto: PrototypeInfo; open: boolean; onOpenChange: (open: boolean) => void };

export default function RenamePrototypeDialog({ proto, open, onOpenChange }: Props) {
  const applyRename = useRenamePrototype(proto);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(form: FormData) {
    setSaving(true);
    setError(null);
    try {
      await applyRename({ title: String(form.get('title') ?? '') });
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        {/* key: reset the fields to the saved values each time it opens */}
        <form key={String(open)} action={save} className='grid gap-4'>
          <DialogHeader>
            <DialogTitle>Rename prototype</DialogTitle>
            <DialogDescription>
              {policyFor(proto.contributorKey, MODULES) !== 'owner'
                ? 'Its link stays the same when its title changes.'
                : 'A new title renames the folder, so the link changes.'}
            </DialogDescription>
          </DialogHeader>
          <label className='grid gap-1.5 text-sm font-medium'>
            Title
            <Input name='title' defaultValue={proto.title} required autoFocus />
          </label>
          {(proto.contributor || proto.created) && (
            <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-muted-foreground'>
              {proto.contributor && (
                <>
                  <dt>Contributor</dt>
                  <dd>{proto.contributor}</dd>
                </>
              )}
              {proto.created && (
                <>
                  <dt>Created</dt>
                  <dd>{formatDate(proto.created)}</dd>
                </>
              )}
            </dl>
          )}
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? 'Renaming' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
