import { Fragment, useSyncExternalStore, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GridViewIcon, InformationCircleIcon, LeftToRightListBulletIcon } from '@hugeicons/core-free-icons';
import { Card } from '@/platform/systems/studio/components/card';
import { ToggleGroup, ToggleGroupItem } from '@/platform/systems/studio/components/toggle-group';
import { ItemGroup } from '@/platform/systems/studio/components/item';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/platform/systems/studio/components/tooltip';
import { ItemGrid } from './ItemGrid';

export function ArchivedHeading() {
  return (
    <h2 className='mb-3 flex items-center gap-0.5 text-sm font-semibold text-foreground'>
      Archived
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type='button'
              aria-label='About archived items'
              className='inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
            />
          }
        >
          <HugeiconsIcon icon={InformationCircleIcon} size={14} />
        </TooltipTrigger>
        <TooltipContent>Archived items are excluded from the deployed site.</TooltipContent>
      </Tooltip>
    </h2>
  );
}

// A collection's index (/prototypes, /examples, ...) can be read as cards or as a plain list. Which one is saved in this
// browser and shared by every index, so you choose once. Cards are the default.
const KEY = 'design-studio:collection-view';
export type CollectionView = 'cards' | 'list';
const read = (): CollectionView => (localStorage.getItem(KEY) === 'list' ? 'list' : 'cards');
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

export function useCollectionView() {
  const view = useSyncExternalStore(subscribe, read, () => 'cards' as CollectionView);
  const setView = (next: CollectionView) => {
    localStorage.setItem(KEY, next);
    listeners.forEach(l => l());
  };
  return [view, setView] as const;
}

// The two-button switch for the header of an index.
export function ViewToggle() {
  const [view, setView] = useCollectionView();
  return (
    <ToggleGroup
      variant='outline'
      spacing={0}
      aria-label='View as'
      value={[view]}
      // Pressing the choice that is already on turns it off; the view stays as it is.
      onValueChange={next => {
        const choice = next[0];
        if (choice === 'cards' || choice === 'list') setView(choice);
      }}
    >
      <ToggleGroupItem value='cards' aria-label='Cards' title='Cards'>
        <HugeiconsIcon icon={GridViewIcon} />
      </ToggleGroupItem>
      <ToggleGroupItem value='list' aria-label='List' title='List'>
        <HugeiconsIcon icon={LeftToRightListBulletIcon} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// The items as a grid of cards (each in an <li>) or a list of rows (ItemRow draws its own <li>), as the reader chose.
export function Collection<T>({
  items,
  keyOf,
  card,
  row,
}: {
  items: T[];
  keyOf: (item: T) => string;
  card: (item: T) => ReactNode;
  row: (item: T) => ReactNode;
}) {
  const [view] = useCollectionView();
  if (view === 'list')
    return (
      <Card className='gap-0 p-2'>
        <ItemGroup className='gap-0'>
          {items.map(item => (
            <Fragment key={keyOf(item)}>{row(item)}</Fragment>
          ))}
        </ItemGroup>
      </Card>
    );
  return (
    <ItemGrid>
      {items.map(item => (
        <li key={keyOf(item)}>{card(item)}</li>
      ))}
    </ItemGrid>
  );
}
