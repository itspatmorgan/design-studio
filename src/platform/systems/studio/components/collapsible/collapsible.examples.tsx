import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/platform/systems/studio/components/collapsible';

export const Default = () => (
  <Collapsible className='w-64 text-sm'>
    <CollapsibleTrigger className='group flex items-center gap-1.5 font-medium'>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        size={14}
        className='text-muted-foreground transition-transform group-not-data-panel-open:-rotate-90'
      />
      Toggle details
    </CollapsibleTrigger>
    <CollapsibleContent className='pt-2 pl-5 text-muted-foreground'>Hidden until opened.</CollapsibleContent>
  </Collapsible>
);
