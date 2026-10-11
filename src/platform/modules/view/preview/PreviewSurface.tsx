// Child-document renderer. Shared by page previews and inert embeds.
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeScope } from '@/platform/modules/systems/ThemeScope';
import { PortalContext } from '@/lib/portal';
import { PrototypeNavigationProvider } from '@/platform/modules/prototypes/lib';
import ViewError from '@/platform/modules/prototypes/viewer/ViewError';
import MissingSystem from '@/platform/modules/prototypes/viewer/MissingSystem';
import EmptyView from '../EmptyView';
import type { loadView } from '../load';
import type { Surface } from './protocol';
import '../lofi.css';

export type LoadedView = NonNullable<Awaited<ReturnType<typeof loadView>>>;
function Committed({ ready }: { ready: () => void }) {
  useEffect(ready, [ready]);
  return null;
}
export default function PreviewSurface({
  loaded,
  surface,
  ready,
  failed,
}: {
  loaded: LoadedView;
  surface: Surface;
  ready: () => void;
  failed: (error: unknown) => void;
}) {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const { Component, prototype, viewKey, themeClass, empty, missingSystem, lofi } = loaded;
  if (missingSystem)
    return (
      <>
        <MissingSystem label={missingSystem} />
        <Committed ready={ready} />
      </>
    );
  if (empty)
    return (
      <>
        <EmptyView path={empty.path} />
        <Committed ready={ready} />
      </>
    );
  return (
    <ErrorBoundary
      resetKeys={[viewKey, Component]}
      onError={failed}
      fallbackRender={props =>
        surface === 'page' ? (
          <ViewError {...props} />
        ) : (
          <p role='alert' className='p-4 text-sm'>
            This view has an error. Open it to see what is wrong.
          </p>
        )
      }
    >
      <ThemeScope
        themeClass={themeClass}
        className={
          (lofi ? 'lofi-view ' : '') +
          'bg-background text-foreground relative flex min-h-0 flex-1 flex-col [contain:layout]'
        }
      >
        <div className='min-h-0 flex-1 overflow-auto'>
          <PortalContext.Provider value={portal}>
            <PrototypeNavigationProvider value={prototype}>
              <Component />
              <Committed ready={ready} />
            </PrototypeNavigationProvider>
          </PortalContext.Provider>
        </div>
        <div ref={setPortal} />
      </ThemeScope>
    </ErrorBoundary>
  );
}
