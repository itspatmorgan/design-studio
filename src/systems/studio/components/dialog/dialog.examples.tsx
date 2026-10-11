import { Button } from '@/systems/studio/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/systems/studio/components/dialog';
import { Input } from '@/systems/studio/components/input';

export const Confirm = () => (
  <Dialog>
    <DialogTrigger render={<Button variant='outline' />}>Discard changes</DialogTrigger>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Discard your changes?</DialogTitle>
        <DialogDescription>You have unsaved changes. They'll be lost if you leave.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant='outline' />}>Keep editing</DialogClose>
        <DialogClose render={<Button variant='destructive' />}>Discard</DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const WithField = () => (
  <Dialog>
    <DialogTrigger render={<Button variant='outline' />}>Rename</DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rename prototype</DialogTitle>
        <DialogDescription>Its link changes with its name.</DialogDescription>
      </DialogHeader>
      <Input defaultValue='Checkout flow' aria-label='Name' />
      <DialogFooter>
        <DialogClose render={<Button variant='outline' />}>Cancel</DialogClose>
        <DialogClose render={<Button />}>Rename</DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
