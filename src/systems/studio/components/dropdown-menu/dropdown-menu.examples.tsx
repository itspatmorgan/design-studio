import { useState } from 'react';
import { Button } from '@/systems/studio/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/systems/studio/components/dropdown-menu';

export const Actions = () => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant='outline' />}>New</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>New document</DropdownMenuItem>
      <DropdownMenuItem>New folder</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        Import<DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const Checkboxes = () => {
  const [hidden, setHidden] = useState(false);
  const [sorted, setSorted] = useState(true);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' />}>View</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem checked={sorted} onCheckedChange={setSorted}>
          Sort by name
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={hidden} onCheckedChange={setHidden}>
          Show hidden files
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Radio = () => {
  const [density, setDensity] = useState('default');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' />}>Density: {density}</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Density</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={density} onValueChange={setDensity}>
            <DropdownMenuRadioItem value='compact'>Compact</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='default'>Default</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='comfortable'>Comfortable</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
