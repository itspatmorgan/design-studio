// Confirms deleting a prototype you own, in dev. The whole folder goes to the Trash
// (src/platform/node/build/vite-files-plugin.js), and the app goes back to the Prototypes page.
import { useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { deletePrototype } from '@/platform/app/data/files';
import { setManifest } from '@/platform/app/data/manifest';
import type { PrototypeInfo } from '@/platform/app/data/types';
import { toast } from '@/platform/systems/studio/components/toast';
import { Button } from '@/platform/systems/studio/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/platform/systems/studio/components/dialog';

type Props = { proto: PrototypeInfo; open: boolean; onOpenChange: (open: boolean) => void };

export default function DeletePrototypeDialog({ proto, open, onOpenChange }: Props) {
  const router = useRouter();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const result = await deletePrototype(proto);
      setManifest(result.manifest);
      onOpenChange(false);
      // Keep index filters in place. Leave an open prototype before invalidating it.
      if (router.state.location.pathname !== '/prototypes') await navigate({ to: '/prototypes' as never });
      await router.invalidate();
      toast.add({ title: `Moved “${proto.title}” to the Trash` });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
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
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete “{proto.title}”?</DialogTitle>
          <DialogDescription>
            Everything in it moves to the Trash, where you can restore it. Its link stops working until you do.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant='destructive' disabled={deleting} onClick={remove}>
            {deleting ? 'Deleting' : 'Delete prototype'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
