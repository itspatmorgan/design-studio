// "New prototype" on the Prototypes page, in dev: the same as pnpm new, from the app.
// It creates the folder in your space (src/modules/prototypes/node/create.js) and opens it.
import { useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { createPrototype, useMe } from '@/platform/app/data/files';
import { findPrototype, prototypeLink, setManifest } from '@/platform/app/data/manifest';
import { DEFAULT_SYSTEM, ACTIVE_PROTOTYPE_SYSTEMS } from '@/modules/systems/data/systems';
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

export default function NewPrototypeButton() {
  // Dev only: in the build, this is false and the rest is left out of the deployed site.
  if (!import.meta.env.DEV) return null;
  return <NewPrototype />;
}

function NewPrototype() {
  const me = useMe();
  const router = useRouter();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  // Only while the app runs locally, for contributors.
  if (!me) return null;

  async function create(form: FormData) {
    setSaving(true);
    setError(null);
    try {
      const result = await createPrototype(String(form.get('title') ?? ''), system === '__none' ? null : system);
      setManifest(result.manifest);
      await router.invalidate();
      setOpen(false);
      const created = findPrototype(result.manifest, result.contributor, result.prototype);
      if (!created) throw new Error('The new prototype is missing from the inventory.');
      navigate(prototypeLink(created));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          setSystem(DEFAULT_SYSTEM);
          setOpen(true);
        }}
      >
        <HugeiconsIcon icon={Add01Icon} data-icon='inline-start' /> New prototype
      </Button>
      <Dialog
        open={open}
        onOpenChange={o => {
          setError(null);
          setOpen(o);
        }}
      >
        <DialogContent>
          <form key={String(open)} action={create} className='grid gap-4'>
            <DialogHeader>
              <DialogTitle>New prototype</DialogTitle>
              <DialogDescription>Give your idea a name and choose its design system.</DialogDescription>
            </DialogHeader>
            <label className='grid gap-1.5 text-sm font-medium'>
              Title
              <Input name='title' required autoFocus placeholder='Agent Config' />
            </label>
            <div className='grid gap-1.5'>
              <label id='prototype-system-label' className='text-sm font-medium'>
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
                <SelectTrigger aria-labelledby='prototype-system-label' className='w-full'>
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
                {system === '__none'
                  ? 'Start with your own components and CSS. No existing system library or theme is assigned.'
                  : 'Provides components, styles, and guidance for this prototype.'}
              </p>
            </div>
            {error && (
              <p role='alert' className='text-sm text-destructive'>
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={saving}>
                {saving ? 'Creating' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
