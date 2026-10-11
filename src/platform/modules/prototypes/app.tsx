// Prototypes in the app: the gallery at /prototypes, its rail button, and its entries in the ⌘K palette.
// A prototype itself opens in the viewer (viewer/), through the platform's item routes
// (src/platform/app/router.tsx), at /prototypes/<person>/<id>.
import { createRoute } from '@tanstack/react-router';
import { CursorInWindowIcon } from '@hugeicons/core-free-icons';
import { CommandGroup, CommandItem, CommandSeparator } from '@/platform/systems/studio/components/command';
import { HomeHint, HomeSection } from '@/platform/app/items/HomeSection';
import { useMe } from '@/platform/app/data/files';
import { APP_NAME } from '@/platform/app/data/config';
import { newestFirst, prototypeLink } from '@/platform/app/data/manifest';
import type { ModuleApp, PaletteContext } from '@/platform/core/api';
import type { Manifest } from '@/platform/app/data/types';
import Gallery from './gallery/Gallery';
import NewPrototypeButton from './gallery/NewPrototypeDialog';
import { PrototypeRow } from './gallery/PrototypeCard';

type GallerySearch = { q?: string; system?: string };

function PrototypesPlaces({ go }: PaletteContext) {
  return (
    <CommandItem value='prototypes gallery' onSelect={() => go({ to: '/prototypes' } as never)}>
      Prototypes
    </CommandItem>
  );
}

function PrototypesPalette({ manifest, current, go }: PaletteContext) {
  const prototypes = [...manifest.prototypes].sort(newestFirst);
  if (!prototypes.length) return null;
  return (
    <>
      <CommandSeparator />
      <CommandGroup heading='Prototypes'>
        {prototypes.map(p => (
          <CommandItem
            key={`${p.contributorKey}/${p.id}`}
            value={`${p.title} ${p.contributor ?? ''} ${p.contributorKey}/${p.id}`}
            disabled={p === current}
            onSelect={() => go(prototypeLink(p))}
          >
            <span className='truncate'>{p.title}</span>
            <span className='ml-auto shrink-0 text-xs text-muted-foreground'>
              {(p.contributor || p.contributorKey).split(' ')[0]}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}

// On the front page, the newest prototypes with the title above linking to all of them: five on the deployed site, where
// they are the main thing, and three of each below when you run the app locally, where your own come first and the
// newest are the other people's, so none is shown twice. With none at all, locally it offers to start one, and on the
// deployed site it says nothing is published yet.
function Overview({ manifest }: { manifest: Manifest }) {
  const me = useMe();
  const shown = me ? 3 : 5;
  const live = manifest.prototypes.filter(p => p.status !== 'archived').sort(newestFirst);
  const mine = me ? live.filter(p => p.contributorKey === me) : [];
  const latest = (me ? live.filter(p => p.contributorKey !== me) : live).slice(0, shown);
  const rows = (list: typeof live, byline: boolean) => (
    <ul>
      {list.map(p => (
        <PrototypeRow key={`${p.contributorKey}/${p.id}`} prototype={p} byline={byline} />
      ))}
    </ul>
  );
  if (!live.length && !(import.meta.env.DEV && me))
    return (
      <HomeSection title='Prototypes' to='/prototypes'>
        <HomeHint>Nothing published yet.</HomeHint>
      </HomeSection>
    );
  return (
    <>
      {me && (
        <HomeSection title='Your prototypes' to='/prototypes'>
          {mine.length ? (
            rows(mine.slice(0, shown), false)
          ) : (
            <div className='py-[7px] pl-2'>
              <NewPrototypeButton />
            </div>
          )}
        </HomeSection>
      )}
      {latest.length > 0 && (
        <HomeSection title={me ? 'Latest from the team' : 'Latest prototypes'} to='/prototypes'>
          {rows(latest, true)}
        </HomeSection>
      )}
    </>
  );
}

export default {
  icon: CursorInWindowIcon,
  rail: 'top',
  order: 0,
  // Locally your own prototypes come first. Modules can set their overview order for local and deployed use.
  homeOrder: { local: 0, deployed: 15 },
  routes: root => [
    createRoute({
      getParentRoute: () => root,
      path: 'prototypes',
      // https://tanstack.com/router/latest/docs/framework/react/guide/search-params#validating-search-params
      validateSearch: (search: Record<string, unknown>): GallerySearch => ({
        q: typeof search.q === 'string' && search.q ? search.q : undefined,
        system: typeof search.system === 'string' && search.system ? search.system : undefined,
      }),
      head: () => ({ meta: [{ title: `Prototypes — ${APP_NAME}` }] }),
      component: Gallery,
    }),
  ],
  overview: Overview,
  places: PrototypesPlaces,
  palette: PrototypesPalette,
} satisfies ModuleApp;
