import { systemPath } from '../data/systems';
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ExternalLink, Image, Smile, Type } from 'lucide-react';
import { useManifest } from '@/platform/app/data/useManifest';
import { buttonVariants } from '@/systems/studio/components/button';
import type { DesignSystem } from '@/platform/app/data/types';
import { NotFound } from '@/platform/app/shell/App';
import { IconsPage, PageHeader } from './foundations';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/systems/studio/components/empty';
import { ThemeScope } from '../ThemeScope';
import { assetLink, systemAssets, type SystemAsset } from '../data/assets';

function FontPreview({ asset }: { asset: SystemAsset }) {
  const [family, setFamily] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFamily(undefined);
    setFailed(false);
    // A distinct family prevents preview fonts from replacing any system's typography.
    const name = `studio-asset-${crypto.randomUUID()}`;
    const font = new FontFace(name, `url(${JSON.stringify(asset.url)})`);
    let active = true;
    font.load().then(loaded => {
      if (active) { document.fonts.add(loaded); setFamily(name); }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; document.fonts.delete(font); };
  }, [asset.url]);
  if (!family) return <p role="status" className="text-sm text-muted-foreground">{failed ? 'This font could not be previewed.' : 'Loading font'}</p>;
  return <div className="space-y-4 break-words" style={{ fontFamily: family }}>
    <p className="text-3xl">The quick brown fox jumps over the lazy dog.</p>
    <p className="text-lg">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />abcdefghijklmnopqrstuvwxyz<br />0123456789</p>
  </div>;
}

export default function SystemAssets({ system, sys, kind, path }: { system: string; sys: DesignSystem; kind?: SystemAsset['kind']; path?: string }) {
  const assets = systemAssets(system);
  const libraries = (useManifest().systems[system]?.libraries ?? []).filter(library => library.assets?.some(asset => asset === kind?.toLowerCase()));
  if (path) {
    const asset = assets.find(item => item.path === path);
    if (!asset || (kind && asset.kind !== kind)) return <NotFound />;
    return <>
      <Link to={`${systemPath(system)}/${asset.kind.toLowerCase()}` as never} className="mb-4 inline-block text-sm hover:underline">{asset.kind}</Link>
      <PageHeader title={asset.path.split('/').pop()!} description={asset.path} />
      <div className="rounded-xl border border-border bg-muted/40 p-6">
        {asset.kind === 'Fonts' ? <FontPreview asset={asset} /> : <img src={asset.url} alt={asset.path} className="mx-auto max-h-[24rem] max-w-full object-contain" />}
      </div>
      <p className="mt-4 break-all text-xs text-muted-foreground">{`src/systems/${system}/assets/${asset.path}`}</p>
    </>;
  }
  if (!kind) return <NotFound />;
  const items = assets.filter(asset => asset.kind === kind);
  const empty = !items.length && !(kind === 'Icons' && sys.icons);
  const description = {
    Fonts: 'Fonts for your system’s typography.',
    Icons: 'Icons for your system’s interface.',
    Images: 'Logos and shared images for your prototypes.',
  }[kind];
  const Icon = { Fonts: Type, Icons: Smile, Images: Image }[kind];
  const emptyDescription = {
    Fonts: 'Ask your agent to bring in your product’s font files and connect them to this system’s theme.',
    Icons: 'Ask your agent to bring in your custom icons for this system’s components.',
    Images: 'Ask your agent to add logos and shared images for prototypes using this system.',
  }[kind];
  return <>
    <PageHeader title={kind} description={description} />
    {libraries.length > 0 && <div className="mb-6 space-y-4">{libraries.map(library => <section key={library.id} className="rounded-xl border border-border bg-muted/40 p-6">
      <h2 className="text-lg font-semibold">{library.label}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{kind === 'Icons' ? 'Use icons from this library’s full catalog in your prototypes.' : library.description}</p>
      <a href={library.docs} target="_blank" rel="noreferrer" className={`mt-4 ${buttonVariants({ variant: 'outline', size: 'sm' })}`}>{kind === 'Icons' ? 'Browse icons' : 'Documentation'} <ExternalLink aria-hidden="true" className="size-3.5" /></a>
    </section>)}</div>}
    {kind === 'Icons' && sys.icons && <ThemeScope themeClass={sys.scopeClass}><IconsPage icons={sys.icons} /></ThemeScope>}
    <h2 className="mb-2 text-lg font-semibold">Local {kind.toLowerCase()}</h2>
    <p className="mb-4 text-sm text-muted-foreground">Files added directly to this system.</p>
    {items.length ? <ul className="space-y-2">{items.map(asset => <li key={asset.path}>
      <Link to={assetLink(system, asset) as never} className="flex items-center gap-4 rounded-lg border border-border px-4 py-3 hover:bg-muted">
        {kind !== 'Fonts' && <img src={asset.url} alt="" loading="lazy" className="size-10 shrink-0 object-contain" />}
        <span className="min-w-0 break-all text-sm">{asset.path}</span>
      </Link>
    </li>)}</ul> : libraries.length || (kind === 'Icons' && sys.icons) ? <p className="text-sm text-muted-foreground">No local {kind.toLowerCase()} added.</p> : empty && <Empty className="min-h-[16rem] border border-solid border-border/50 bg-muted/40">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-background"><Icon aria-hidden="true" /></EmptyMedia>
        <EmptyTitle>No local {kind.toLowerCase()} yet</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </EmptyHeader>
    </Empty>}
  </>;
}
