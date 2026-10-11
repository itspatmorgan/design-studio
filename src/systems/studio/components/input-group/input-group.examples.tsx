import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/systems/studio/components/input-group';

export const WithIcon = () => (
  <InputGroup className='w-xs'>
    <InputGroupAddon>
      <HugeiconsIcon icon={Search01Icon} size={16} />
    </InputGroupAddon>
    <InputGroupInput placeholder='Search prototypes' />
  </InputGroup>
);

export const WithText = () => (
  <InputGroup className='w-xs'>
    <InputGroupAddon>
      <InputGroupText>https://</InputGroupText>
    </InputGroupAddon>
    <InputGroupInput placeholder='example.com' />
  </InputGroup>
);

export const WithButton = () => (
  <InputGroup className='w-xs'>
    <InputGroupInput defaultValue='localhost:5173/patrick/hello-world' readOnly />
    <InputGroupAddon align='inline-end'>
      <InputGroupButton aria-label='Copy link'>
        <HugeiconsIcon icon={Copy01Icon} size={14} />
      </InputGroupButton>
    </InputGroupAddon>
  </InputGroup>
);

export const MultiLine = () => (
  <InputGroup className='w-xs'>
    <InputGroupTextarea placeholder='Write a note' rows={3} />
    <InputGroupAddon align='block-end'>
      <InputGroupText>0 / 200</InputGroupText>
    </InputGroupAddon>
  </InputGroup>
);
