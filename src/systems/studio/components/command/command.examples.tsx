import { useState } from 'react';
import { Button } from '@/systems/studio/components/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/systems/studio/components/command';

export const Dialog = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant='outline' onClick={() => setOpen(true)}>
        Open command menu
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder='Type a command' />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading='Pages'>
              <CommandItem onSelect={() => setOpen(false)}>Prototypes</CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>Systems</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Settings'>
              <CommandItem onSelect={() => setOpen(false)}>Toggle dark mode</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};
