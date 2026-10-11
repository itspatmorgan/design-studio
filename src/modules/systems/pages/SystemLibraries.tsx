import { Link } from '@tanstack/react-router';
import { ExternalLink, Image, Library, Smile, Type } from 'lucide-react';
import { useManifest } from '@/platform/app/data/useManifest';
import { PageHeader } from './foundations';
import { systemPath } from '../data/systems';

export default function SystemLibraries({ system, label }: { system: string; label: string }) {
  const inventory = useManifest().systems[system];
  const libraries = inventory?.libraries ?? [];
  return (
    <>
      <PageHeader title='Libraries' description={`The sources and tools behind ${label}.`} />
      {!libraries.length && (
        <div className='rounded-xl border border-border bg-muted/40 p-6'>
          <Library aria-hidden='true' className='mb-3 size-5 text-muted-foreground' />
          <h2 className='font-medium'>No libraries added yet</h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            Ask your agent to add a library when your system needs more capabilities.
          </p>
        </div>
      )}
      {libraries.length > 0 && (
        <ul aria-label='System libraries' className='space-y-3'>
          {libraries.map(library => {
            const Icon = library.assets?.includes('icons')
              ? Smile
              : library.assets?.includes('fonts')
                ? Type
                : library.assets?.includes('images')
                  ? Image
                  : Library;
            return (
              <li
                id={library.id}
                key={library.id}
                className='flex scroll-mt-6 items-start gap-3 rounded-lg border border-border p-4'
              >
                <Icon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-3'>
                  <div className='min-w-0 flex-1 basis-56'>
                    <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                      <h2 className='text-sm font-semibold'>{library.label}</h2>
                      {(library.version || library.kind === 'package') && (
                        <span className='text-xs text-muted-foreground'>
                          {library.version ? `v${library.version}` : 'Not installed'}
                        </span>
                      )}
                    </div>
                    {library.kind === 'package' && !library.version && (
                      <p role='status' className='mt-1 text-xs text-muted-foreground'>
                        Ask your agent to install this dependency.
                      </p>
                    )}
                    <p className='mt-1 text-sm text-muted-foreground'>{library.description}</p>
                  </div>
                  <div className='ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm'>
                    {library.assets?.includes('fonts') && (
                      <Link
                        to={`${systemPath(system)}/typography` as never}
                        className='underline underline-offset-4 hover:text-muted-foreground'
                      >
                        Typography
                      </Link>
                    )}
                    {library.assets?.map(asset => (
                      <Link
                        key={asset}
                        to={`${systemPath(system)}/${asset}` as never}
                        className='underline underline-offset-4 hover:text-muted-foreground'
                      >
                        {asset[0].toUpperCase() + asset.slice(1)}
                      </Link>
                    ))}
                    {library.kind === 'package' &&
                      inventory?.components
                        .filter(component => library.components?.includes(component.slug))
                        .map(component => (
                          <Link
                            key={component.slug}
                            to={`${systemPath(system)}/components/${component.slug}` as never}
                            className='underline underline-offset-4 hover:text-muted-foreground'
                          >
                            {component.title}
                          </Link>
                        ))}
                    <a
                      href={library.docs}
                      target='_blank'
                      rel='noreferrer'
                      aria-label={`${library.label} documentation`}
                      className='inline-flex items-center gap-1 underline underline-offset-4 hover:text-muted-foreground'
                    >
                      Docs <ExternalLink aria-hidden='true' className='size-3.5' />
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
