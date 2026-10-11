import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/systems/studio/components/button';

export const Variants = () => (
  <>
    <Button>Primary</Button>
    <Button variant='secondary'>Secondary</Button>
    <Button variant='outline'>Outline</Button>
    <Button variant='ghost'>Ghost</Button>
    <Button variant='destructive'>Destructive</Button>
    <Button variant='link'>Link</Button>
  </>
);

export const Sizes = () => (
  <>
    <Button size='sm'>Small</Button>
    <Button>Default</Button>
    <Button size='lg'>Large</Button>
    <Button size='icon' aria-label='Add'>
      <HugeiconsIcon icon={Add01Icon} size={16} />
    </Button>
  </>
);

export const Disabled = () => <Button disabled>Disabled</Button>;
