import { GridViewIcon, LeftToRightListBulletIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ToggleGroup, ToggleGroupItem } from '@/platform/systems/studio/components/toggle-group';

// Each export named with a capital is one example on the component's page, shown live with its code.
export const Default = () => (
  <ToggleGroup variant='outline' defaultValue={['cards']}>
    <ToggleGroupItem value='cards' aria-label='Cards'>
      <HugeiconsIcon icon={GridViewIcon} />
    </ToggleGroupItem>
    <ToggleGroupItem value='list' aria-label='List'>
      <HugeiconsIcon icon={LeftToRightListBulletIcon} />
    </ToggleGroupItem>
  </ToggleGroup>
);

export const WithText = () => (
  <ToggleGroup variant='outline' size='sm' defaultValue={['week']}>
    <ToggleGroupItem value='day'>Day</ToggleGroupItem>
    <ToggleGroupItem value='week'>Week</ToggleGroupItem>
    <ToggleGroupItem value='month'>Month</ToggleGroupItem>
  </ToggleGroup>
);
