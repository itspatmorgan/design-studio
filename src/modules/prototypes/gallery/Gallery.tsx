import { Popover } from '@base-ui/react/popover';
import { Button } from '@/platform/systems/studio/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/platform/systems/studio/components/select';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/platform/systems/studio/components/input-group';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, CursorInWindowIcon, FilterIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { getRouteApi, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { matchesSystem } from '@/platform/app/data/manifest';
import { PROTOTYPE_SYSTEMS } from '@/modules/systems/data/systems';
import { newestFirst } from '@/platform/app/data/manifest';
import type { PrototypeInfo } from '@/platform/app/data/types';
import { cn } from '@/lib/utils';
import { ArchivedHeading, Collection, ViewToggle } from '@/platform/app/items/Collection';
import NewPrototypeButton from '@/modules/prototypes/gallery/NewPrototypeDialog';
import PrototypeCard, { PrototypeRow } from './PrototypeCard';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/platform/systems/studio/components/empty';
import { useMe } from '@/platform/app/data/files';

const rootApi = getRouteApi('__root__');

// Search box: filters by title and contributor. The text lives in ?q=. It's short until
// you use it, then widens: while it's focused, and while it holds a search.
function SearchBox({ value, system }: { value: string; system?: string }) {
  const navigate = useNavigate();
  // replace: typing doesn't add a history entry per keystroke. (The gallery's route is added by the module,
  // so the router's types don't know it: it's written loosely.)
  const set = (q: string) => navigate({ to: '.', search: { q: q || undefined, system } as never, replace: true });
  return (
    <form
      role='search'
      onSubmit={e => e.preventDefault()}
      className={cn(
        'shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none',
        value ? 'w-64' : 'w-36 focus-within:w-64',
      )}
    >
      <InputGroup>
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} />
        </InputGroupAddon>
        <InputGroupInput
          name='q'
          inputMode='search'
          aria-label='Search prototypes'
          placeholder='Search'
          value={value}
          onChange={e => set(e.target.value)}
        />
        {value && (
          <InputGroupAddon align='inline-end'>
            <InputGroupButton size='icon-xs' aria-label='Clear search' onClick={() => set('')}>
              <HugeiconsIcon icon={Cancel01Icon} />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </form>
  );
}

function SystemFilter({ value, search }: { value?: string; search: string }) {
  const navigate = useNavigate();
  const items = [
    { value: '__all', label: 'All systems' },
    ...Object.entries(PROTOTYPE_SYSTEMS).map(([value, spec]) => ({ value, label: spec.label })),
  ];
  if (value && !PROTOTYPE_SYSTEMS[value]) items.push({ value, label: value });
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant='outline' size='icon' className='relative' />}
        aria-label={value ? 'Filters, 1 active' : 'Filters'}
        title='Filters'
      >
        <HugeiconsIcon icon={FilterIcon} aria-hidden />
        {value && <span aria-hidden className='absolute top-1 right-1 size-1.5 rounded-full bg-primary' />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align='end' sideOffset={8} className='isolate z-50'>
          <Popover.Popup className='w-64 rounded-lg bg-popover p-4 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none'>
            <Popover.Title className='mb-4 text-sm font-semibold'>Filters</Popover.Title>
            <label id='gallery-system-filter-label' className='mb-2 block text-sm font-medium'>
              System
            </label>
            <Select
              items={items}
              value={value ?? '__all'}
              onValueChange={next => {
                if (next)
                  void navigate({
                    to: '.',
                    search: { q: search || undefined, system: next === '__all' ? undefined : next } as never,
                  });
              }}
            >
              <SelectTrigger aria-labelledby='gallery-system-filter-label' className='w-full'>
                <SelectValue className='truncate' />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const matches = (p: PrototypeInfo, q: string) =>
  [p.title, p.contributor, p.contributorKey, p.id].some(f => f?.toLowerCase().includes(q));

export default function Gallery() {
  const manifest = rootApi.useLoaderData();
  const filters = useSearch({ strict: false }) as { q?: string; system?: string };
  const search = filters.q ?? '';
  const system = filters.system;
  const q = search.trim().toLowerCase();
  // Only while the app runs locally, for contributors: the others can't make one.
  const me = useMe();
  const local = import.meta.env.DEV && me !== null;
  const empty = !manifest.prototypes.length;
  let body;
  if (empty)
    body = local ? (
      <Empty className='border border-dashed py-16'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <HugeiconsIcon icon={CursorInWindowIcon} />
          </EmptyMedia>
          <EmptyTitle>No prototypes yet</EmptyTitle>
          <EmptyDescription>A working sketch of an idea: real screens you can click through.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    ) : (
      <Empty className='border border-dashed py-16'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <HugeiconsIcon icon={CursorInWindowIcon} />
          </EmptyMedia>
          <EmptyTitle>No prototypes yet</EmptyTitle>
          <EmptyDescription>Prototypes your team makes will show up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  else {
    // Newest first, by meta.json "created".
    const prototypes = manifest.prototypes
      .filter(p => matchesSystem(p, system) && (!q || matches(p, q)))
      .sort(newestFirst);
    // Archived prototypes show here, below the rest. The deployed site leaves them out.
    const list = (ps: PrototypeInfo[]) => (
      <Collection
        items={ps}
        keyOf={p => `${p.contributorKey}/${p.id}`}
        card={p => <PrototypeCard prototype={p} />}
        row={p => <PrototypeRow prototype={p} showCreated />}
      />
    );
    const active = prototypes.filter(p => p.status !== 'archived');
    const archived = prototypes.filter(p => p.status === 'archived');
    body = prototypes.length ? (
      <>
        {active.length > 0 && list(active)}
        {archived.length > 0 && (
          <section className={active.length ? 'mt-10' : ''}>
            <ArchivedHeading />
            {list(archived)}
          </section>
        )}
      </>
    ) : (
      <div className='py-16 text-center'>
        <p className='mb-2 text-lg font-semibold text-foreground'>No matches</p>
        <p className='mb-4 text-sm text-muted-foreground'>Try a different search or system.</p>
        <Link to={'/prototypes' as never} className='text-sm text-primary hover:underline'>
          View all prototypes
        </Link>
      </div>
    );
  }

  return (
    <main className='mx-auto w-full max-w-5xl px-6 pt-12 pb-8'>
      <header className='mb-6'>
        <h1 className='text-2xl font-semibold tracking-tight text-foreground'>Prototypes</h1>
        {/* The subtitle's line is as tall as the controls (32px), so all of them centre on the same line. */}
        <div className='mt-0.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3'>
          <p className='min-w-0 truncate text-sm leading-8 text-muted-foreground'>
            Explore ideas, build interactive prototypes, and document your thinking.
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            {!empty && <SearchBox value={search} system={system} />}
            <SystemFilter value={system} search={search} />
            {!empty && <ViewToggle />}
            <NewPrototypeButton />
          </div>
        </div>
      </header>
      {body}
    </main>
  );
}
