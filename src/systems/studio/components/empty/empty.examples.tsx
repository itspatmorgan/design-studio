import { Layers01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/systems/studio/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/systems/studio/components/empty';

// Each export named with a capital is one example on the component's page, shown live with its code.
export const Default = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant='icon'>
        <HugeiconsIcon icon={Layers01Icon} />
      </EmptyMedia>
      <EmptyTitle>No prototypes yet</EmptyTitle>
      <EmptyDescription>Prototypes your team makes will show up here.</EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button size='sm'>New prototype</Button>
    </EmptyContent>
  </Empty>
);
