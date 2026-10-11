import { Link } from '@tanstack/react-router';
import { ExternalLink, Library } from 'lucide-react';
import { useManifest } from '@/platform/app/data/useManifest';
import { PageHeader } from './foundations';
import { systemPath } from '../data/systems';

export default function SystemLibraries({ system, label }: { system: string; label: string }) {
  const inventory = useManifest().systems[system];
  const libraries = inventory?.libraries ?? [];
  return <>
    <PageHeader title="Libraries" description={`The sources and tools behind ${label}.`} />
    {!libraries.length && <div className="rounded-xl border border-border bg-muted/40 p-6">
      <Library aria-hidden="true" className="mb-3 size-5 text-muted-foreground" />
      <h2 className="font-medium">No libraries added yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">Ask your agent to add a library when your system needs more capabilities.</p>
    </div>}
    {libraries.length > 0 && <ul aria-label="System libraries" className="divide-y divide-border border-y border-border">{libraries.map(library => <li id={library.id} key={library.id} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-sm font-semibold">{library.label}</h2>
          {(library.version || library.kind === 'package') && <span className="text-xs text-muted-foreground">{library.version ? `v${library.version}` : 'Not installed'}</span>}
        </div>
        {library.kind === 'package' && !library.version && <p role="status" className="mt-1 text-xs text-muted-foreground">Ask your agent to install this dependency.</p>}
      </div>
      <p className="text-sm text-muted-foreground">{library.description}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:col-span-2 lg:col-span-1 lg:justify-end">
        {library.kind === 'source' && <Link to={systemPath(system) as never} hash="system-code" className="underline underline-offset-4 hover:text-muted-foreground">Toolkit</Link>}
        {library.assets?.includes('fonts') && <Link to={`${systemPath(system)}/typography` as never} className="underline underline-offset-4 hover:text-muted-foreground">Typography</Link>}
        {library.assets?.map(asset => <Link key={asset} to={`${systemPath(system)}/${asset}` as never} className="underline underline-offset-4 hover:text-muted-foreground">{asset[0].toUpperCase() + asset.slice(1)}</Link>)}
        {inventory?.components.filter(component => library.components?.includes(component.slug)).map(component => <Link key={component.slug} to={`${systemPath(system)}/components/${component.slug}` as never} className="underline underline-offset-4 hover:text-muted-foreground">{component.title}</Link>)}
        <a href={library.docs} target="_blank" rel="noreferrer" aria-label={`${library.label} documentation`} className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-muted-foreground">Docs <ExternalLink aria-hidden="true" className="size-3.5" /></a>
      </div>
    </li>)}</ul>}
  </>;
}
