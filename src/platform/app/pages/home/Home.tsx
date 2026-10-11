// The app's front page: a greeting, a search field, and under them one small panel of what each module chooses to show
// (its `overview`, src/platform/app/modules.ts). The panel is narrow and centred, so it reads as a welcome rather
// than a page to fill, and stays comfortable in the narrow window an agent's harness gives the app. The modules decide
// what is worth showing and in what order, so a module added to the app can put something here with no change to this file.
//
// While you run the app locally it greets you and puts your own work first. The deployed site doesn't know who is
// looking, so it names the app, adds the tagline from studio.config.ts, and puts what colleagues come for first.
import { getRouteApi } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { Card } from '@/platform/systems/studio/components/card';
import { APP_NAME, TAGLINE } from '@/platform/app/data/config';
import { homeApps } from '@/platform/app/modules';
import { useMyName } from '@/platform/app/data/files';
import { useOpenPalette } from '@/platform/app/shell/paletteContext';

const rootApi = getRouteApi('__root__');

export default function Home() {
  const manifest = rootApi.useLoaderData();
  const openPalette = useOpenPalette();
  const local = import.meta.env.DEV;
  // Until the dev server says who you are the heading is blank, so it doesn't change under you.
  const name = useMyName();
  const first = name?.split(' ')[0];
  const heading = name === undefined ? '\u00a0' : first ? `Welcome back, ${first}` : APP_NAME;
  return (
    <main className='mx-auto w-full max-w-xl px-4 pt-[12vh] pb-10'>
      <header className='mb-6'>
        <h1 className='text-center text-2xl font-semibold tracking-tight text-foreground'>{heading}</h1>
        {!local && TAGLINE && <p className='mt-1.5 text-center text-sm text-muted-foreground'>{TAGLINE}</p>}
      </header>
      <Card className='gap-0 py-0 pb-1'>
        {/* The panel's first row is its search: one piece of the panel, flush with its edges and divided from the sections by a line,
            not a field set inside it. It opens the ⌘K palette, the search every page has, put where a first-time visitor will see it.
            Custom on purpose: the stock Button and Kbd looked like a control placed in the panel. */}
        <button
          type='button'
          onClick={openPalette}
          className='flex h-11 w-full items-center gap-2.5 border-b border-border px-4 text-left text-sm text-muted-foreground transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50'
        >
          <HugeiconsIcon icon={Search01Icon} size={16} />
          <span className='flex-1'>Search the studio</span>
          <kbd className='rounded border border-border px-1.5 py-0.5 font-sans text-[11px] leading-none'>⌘K</kbd>
        </button>
        {/* A little more space under the search than between sections, so the top of the list is as far from the line as the bottom is from the edge. */}
        <div className='pt-1.5'>
          {homeApps(local).map(({ spec, app }) => app.overview && <app.overview key={spec.id} manifest={manifest} />)}
        </div>
      </Card>
    </main>
  );
}
