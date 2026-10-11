// The ⌘K palette's dialog. It loads shortly after the app starts (CommandPalette.tsx), so cmdk
// isn't in the main bundle.
import { Fragment, type RefObject } from 'react';
import { getRouteApi, useMatchRoute, useNavigate, useParams, type NavigateOptions } from '@tanstack/react-router';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/platform/systems/studio/components/command';
import { findArtifact, findPrototype, firstArtifact } from '@/platform/app/data/manifest';
import { moduleApps, type PaletteContext } from '@/platform/app/modules';
import type { Artifact, Prototype } from '@/platform/app/data/types';

const rootApi = getRouteApi('__root__');

export default function CommandPaletteDialog({
  open,
  setOpen,
  returnFocus,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const manifest = rootApi.useLoaderData();
  const params = useParams({ strict: false });
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();

  const go = (to: NavigateOptions) => {
    returnFocus.current = null;
    setOpen(false);
    navigate(to);
  };

  // The open prototype, once its items have loaded (the route loads them: manifest.ts).
  const openRef =
    params.contributor && params.prototype ? findPrototype(manifest, params.contributor, params.prototype) : undefined;
  const current = openRef?.artifacts ? (openRef as Prototype) : undefined;
  const openItem = current && (params._splat ? findArtifact(current, params._splat) : firstArtifact(current));
  const isOpen = (item: Artifact) => item === openItem;
  const onHome = Boolean(matchRoute({ to: '/' }));
  const context: PaletteContext = { manifest, current, isOpen, go };

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        finalFocus={() => {
          const target = returnFocus.current;
          // Restore this opening's origin after the modal releases focus containment.
          // Never fall back to the dialog library's older focus history.
          queueMicrotask(() => {
            const active = document.activeElement;
            // A pointer dismissal that already focused another control keeps that focus.
            if (target?.isConnected && (active === document.body || active?.closest('[data-slot="dialog-content"]'))) {
              target.focus({ preventScroll: true });
            }
          });
          return false;
        }}
      >
        <Command>
          <CommandInput placeholder='Search the studio' />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading='Places'>
              <CommandItem value='home overview' disabled={onHome} onSelect={() => go({ to: '/' })}>
                Home
              </CommandItem>
              {import.meta.env.DEV && (
                <CommandItem
                  value='studio settings configuration modules contributors admins'
                  onSelect={() => go({ to: '/settings' } as never)}
                >
                  Studio settings
                </CommandItem>
              )}
              {moduleApps.map(({ spec, app }) => app.places && <app.places key={spec.id} {...context} />)}
            </CommandGroup>

            {moduleApps
              .filter(({ spec }) => spec.id === 'systems' || spec.id === 'prototypes')
              .sort((a, b) => Number(b.spec.id === 'systems') - Number(a.spec.id === 'systems'))
              .map(
                ({ spec, app }) =>
                  app.palette && (
                    <Fragment key={spec.id}>
                      <app.palette {...context} />
                    </Fragment>
                  ),
              )}

            {manifest.manual.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading='Manual'>
                  {manifest.manual.map(page => (
                    <CommandItem
                      key={'manual:' + page.slug}
                      value={'manual ' + page.title + ' ' + (page.source ?? page.slug)}
                      onSelect={() =>
                        go({ to: '/documentation/manual' + (page.slug === 'index' ? '' : '/' + page.slug) } as never)
                      }
                    >
                      <span className='truncate'>{page.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
