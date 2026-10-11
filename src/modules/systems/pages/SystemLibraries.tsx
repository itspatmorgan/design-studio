import { Link } from '@tanstack/react-router';
import { ExternalLink, Library } from 'lucide-react';
import { useManifest } from '@/platform/app/data/useManifest';
import { buttonVariants } from '@/systems/studio/components/button';
import { PageHeader } from './foundations';
import { systemPath } from '../data/systems';

export default function SystemLibraries({ system, label }: { system: string; label: string }) {
  const inventory = useManifest().systems[system];
  const libraries = inventory?.libraries ?? [];
  return <>
    <PageHeader title="Libraries" description={`What ${label} is built from.`} />
    {!libraries.length && <div className="rounded-xl border border-border bg-muted/40 p-6">
      <Library aria-hidden="true" className="mb-3 size-5 text-muted-foreground" />
      <h2 className="font-medium">No libraries added yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">Ask your agent to add a library when your system needs more capabilities.</p>
    </div>}
    <div className="space-y-4">{libraries.map(library => <section id={library.id} key={library.id} className="rounded-xl border border-border bg-muted/40 p-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold">{library.label}</h2>
        {(library.version || library.kind === 'package') && <span className="text-sm text-muted-foreground">{library.version ? `v${library.version}` : 'Not installed'}</span>}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{library.description}</p>
      {library.kind === 'package' && !library.version && <p role="status" className="mt-3 text-sm">Ask your agent to install this system’s dependencies.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={library.docs} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Documentation <ExternalLink aria-hidden="true" className="size-3.5" /></a>
        {library.assets?.map(asset => <Link key={asset} to={`${systemPath(system)}/${asset}` as never} className={buttonVariants({ variant: 'outline', size: 'sm' })}>{asset[0].toUpperCase() + asset.slice(1)}</Link>)}
        {inventory?.components.filter(component => library.components?.includes(component.slug)).map(component => <Link key={component.slug} to={`${systemPath(system)}/components/${component.slug}` as never} className={buttonVariants({ variant: 'outline', size: 'sm' })}>{component.title} examples</Link>)}
      </div>
    </section>)}</div>
  </>;
}
