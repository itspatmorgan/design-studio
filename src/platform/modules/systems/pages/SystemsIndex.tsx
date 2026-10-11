import { systemPath } from '../data/systems';
import { useEffect } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Search01Icon, Shapes01Icon } from '@hugeicons/core-free-icons';
import { ArchivedHeading, Collection, ViewToggle } from '@/platform/app/items/Collection';
import { CollectionCard } from '@/platform/app/items/CollectionCard';
import { ItemRow } from '@/platform/app/items/ItemRow';
import { useManifest } from '@/platform/app/data/useManifest';
import { systemUsage } from '@/platform/app/data/manifest';
import type { SystemIntro } from '@/platform/app/data/types';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/platform/systems/studio/components/input-group';
import { Badge } from '@/platform/systems/studio/components/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/platform/systems/studio/components/tooltip';
import { systemFolder } from '@/platform/core/roots';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/platform/systems/studio/components/empty';
import { DEFAULT_SYSTEM, SYSTEM_SPECS } from '../data/systems';
import { finishSystemDeletion } from './creationTransition';
import SystemActionToast from './SystemActionToast';
import SystemMenu from './SystemMenu';
import NewSystemButton from './NewSystemDialog';

const intros = import.meta.glob<{ default: SystemIntro }>(['/platform/systems/*/intro.tsx', '/systems/*/intro.tsx'], {
  eager: true,
});
export default function SystemsIndex() {
  const manifest = useManifest();
  useEffect(() => {
    if (import.meta.env.DEV) finishSystemDeletion(SYSTEM_SPECS, manifest.systems);
  }, [manifest]);
  const navigate = useNavigate();
  const { q = '' } = useSearch({ strict: false }) as { q?: string };
  const setSearch = (value: string) =>
    void navigate({ to: '/systems' as never, search: { q: value || undefined } as never, replace: true });
  const items = Object.entries(SYSTEM_SPECS)
    .map(([id, spec]) => {
      const intro = intros[`/${systemFolder(id)}/intro.tsx`]?.default;
      return {
        id,
        spec,
        description:
          intro?.summary ??
          (spec.role === 'platform'
            ? 'The toolkit for Design Studio’s interface.'
            : 'Components, theme, assets, and guidance for your prototypes.'),
      };
    })
    .sort(
      (a, b) =>
        Number(a.spec.role === 'platform') - Number(b.spec.role === 'platform') ||
        Number(b.id === DEFAULT_SYSTEM) - Number(a.id === DEFAULT_SYSTEM) ||
        a.spec.label.localeCompare(b.spec.label),
    );
  const filtered = items.filter(item =>
    [item.id, item.spec.label, item.description, item.id === DEFAULT_SYSTEM ? 'Default' : ''].some(value =>
      value.toLowerCase().includes(q.trim().toLowerCase()),
    ),
  );
  const systemBadge = (item: (typeof items)[number]) =>
    item.spec.role === 'platform' ? (
      <Tooltip>
        <TooltipTrigger render={<Badge variant='secondary' tabIndex={0} className='cursor-help' />}>
          Platform
        </TooltipTrigger>
        <TooltipContent>
          Powers Design Studio’s interface. Required by the platform and unavailable for prototypes.
        </TooltipContent>
      </Tooltip>
    ) : item.id === DEFAULT_SYSTEM ? (
      <Badge variant='secondary'>Default</Badge>
    ) : undefined;
  const usage = (item: (typeof items)[number]) => {
    if (item.spec.role !== 'prototype') return undefined;
    const count = systemUsage(manifest.prototypes, item.id).count;
    return `Used by ${count} ${count === 1 ? 'prototype' : 'prototypes'}`;
  };
  const active = filtered.filter(item => item.spec.status === 'active');
  const archived = filtered.filter(item => item.spec.status === 'archived');
  const collection = (entries: typeof items) => (
    <Collection
      items={entries}
      keyOf={item => item.id}
      card={item => (
        <CollectionCard
          link={{ to: systemPath(item.id) }}
          icon={Shapes01Icon}
          archived={item.spec.status === 'archived'}
          title={
            <span className='flex min-h-5 items-center gap-2'>
              <span>{item.spec.label}</span>
              {systemBadge(item)}
            </span>
          }
          description={item.description}
          meta={usage(item)}
          menu={<SystemMenu system={item.id} variant='card' />}
        />
      )}
      row={item => (
        <ItemRow
          link={{ to: systemPath(item.id) }}
          icon={Shapes01Icon}
          archived={item.spec.status === 'archived'}
          title={item.spec.label}
          meta={
            <span className='flex items-center gap-2'>
              {systemBadge(item)}
              {usage(item)}
            </span>
          }
          menu={<SystemMenu system={item.id} variant='row' />}
        />
      )}
    />
  );
  return (
    <main className='mx-auto w-full max-w-5xl px-6 pt-12 pb-8'>
      <SystemActionToast />
      <header className='mb-6'>
        <h1 className='text-2xl font-semibold tracking-tight text-foreground'>Systems</h1>
        <div className='mt-0.5 flex flex-wrap items-center justify-between gap-4'>
          <p className='min-w-0 text-sm leading-8 text-muted-foreground'>
            Components, styles, assets, and guidance for your prototypes.
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <form
              role='search'
              onSubmit={event => event.preventDefault()}
              className={
                q ? 'w-64' : 'w-36 focus-within:w-64 transition-[width] duration-200 motion-reduce:transition-none'
              }
            >
              <InputGroup>
                <InputGroupAddon>
                  <HugeiconsIcon icon={Search01Icon} />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label='Search systems'
                  placeholder='Search'
                  value={q}
                  onChange={event => setSearch(event.target.value)}
                />
                {q && (
                  <InputGroupAddon align='inline-end'>
                    <InputGroupButton size='icon-xs' aria-label='Clear search' onClick={() => setSearch('')}>
                      <HugeiconsIcon icon={Cancel01Icon} />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </form>
            <ViewToggle />
            <NewSystemButton />
          </div>
        </div>
      </header>
      {filtered.length ? (
        <>
          {active.length > 0 && collection(active)}
          {archived.length > 0 && (
            <section className={active.length ? 'mt-10' : ''}>
              <ArchivedHeading />
              {collection(archived)}
            </section>
          )}
        </>
      ) : (
        <Empty className='border border-dashed py-16'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <HugeiconsIcon icon={Shapes01Icon} />
            </EmptyMedia>
            <EmptyTitle>No matching systems</EmptyTitle>
            <EmptyDescription>Try a different search.</EmptyDescription>
          </EmptyHeader>
          <Link to={'/systems' as never} search={{} as never} className='text-sm hover:underline'>
            View all systems
          </Link>
        </Empty>
      )}
    </main>
  );
}
