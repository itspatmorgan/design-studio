import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/systems/studio/components/button';
import { Input } from '@/systems/studio/components/input';
import type { SystemCuration, PrototypeInfo } from '@/platform/app/data/types';
import { prototypeLink } from '@/platform/app/data/manifest';
import { systemPath } from '../data/systems';
import { curationPrompt, sourceUrl, curationStages } from '../curation';

type Props = {
  system: string; label: string; curation?: SystemCuration;
  review: { label: string; path: string }[]; prototype?: PrototypeInfo;
};

export default function SystemSetup({ system, label, curation, review, prototype }: Props) {
  const [path, setPath] = useState<'shadcn' | 'untitled' | 'import'>('shadcn');
  const [preset, setPreset] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const prompt = curationPrompt({ system, label, path, preset, curation });
  useEffect(() => { setCopied(false); setError(''); }, [prompt]);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setError(''); }
    catch { setError('Could not copy. Open the instructions below and paste them into your agent’s chat.'); }
  }
  const sources = curation?.sources.flatMap(source => {
    const url = sourceUrl(source.url);
    return url ? [{ ...source, url }] : [];
  }) ?? [];
  return <section className="mb-6 rounded-xl border border-border bg-background p-5" aria-labelledby="system-curation">
    <div className="mb-4 flex items-center gap-2"><Sparkles className="size-4 text-muted-foreground" aria-hidden /><h2 id="system-curation" className="text-lg font-semibold tracking-tight">{curation ? 'Build your system' : 'Choose a starting point'}</h2></div>
    {curation ? <>
      {curation.stage === 'assessment' ? <p className="mb-3 text-xs font-medium text-muted-foreground">Assessing existing React code</p> : <ol className="mb-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Curation stages">{curationStages.map(stage => <li key={stage.id} aria-current={stage.id === curation.stage ? 'step' : undefined} className={`flex items-center gap-2 text-xs ${stage.id === curation.stage ? 'font-medium text-foreground' : 'text-muted-foreground'}`}><span aria-hidden className={`size-1.5 rounded-full ${stage.id === curation.stage ? 'bg-foreground' : 'bg-muted-foreground/40'}`} />{stage.label}</li>)}</ol>}
      <p className="text-sm leading-6">{curation.summary}</p>
      {sources.length > 0 && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">{source.label}<ArrowUpRight className="size-3" aria-hidden /></a>)}</div>}
      {review.length > 0 || prototype ? <div className="mt-5 space-y-2"><p className="text-xs font-medium text-muted-foreground">Review in Studio</p><div className="flex flex-wrap gap-2">{review.map(item => <Button key={item.path} variant="outline" size="sm" render={<Link to={(systemPath(system) + '/' + item.path) as never} />}>{item.label}<ArrowUpRight className="size-3" aria-hidden /></Button>)}{prototype && <Button variant="outline" size="sm" render={<Link {...prototypeLink(prototype)} />}>Try {prototype.title}<ArrowUpRight className="size-3" aria-hidden /></Button>}</div></div> : null}
      <div className="mt-5 border-t border-border pt-4"><p className="mb-1 text-xs font-medium text-muted-foreground">Next with your agent</p><p className="text-sm leading-6">{curation.nextStep}</p></div>
    </> : <>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">Choose your direction. Your agent does the setup work. Return here to review the system and guide what happens next.</p>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="System starting point">{([['shadcn', 'shadcn/ui'], ['untitled', 'Untitled UI'], ['import', 'Your React system']] as const).map(([id, name]) => <Button key={id} variant={path === id ? 'secondary' : 'outline'} size="sm" aria-pressed={path === id} onClick={() => { setPath(id); setCopied(false); setError(''); }}>{name}</Button>)}</div>
      {path === 'shadcn' ? <div className="space-y-4">
        <div><h3 className="text-sm font-medium">Explore your direction in shadcn</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Preview themes, fonts, icons, and styles in its builder. Start with Base UI unless you already have a preference.</p></div>
        <Button variant="outline" size="sm" render={<a href="https://ui.shadcn.com/create" target="_blank" rel="noreferrer" />}>Open shadcn builder<ArrowUpRight className="size-3" aria-hidden /></Button>
        <div><label htmlFor="curation-preset" className="mb-2 block text-sm font-medium">Preset code or builder link <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="curation-preset" value={preset} placeholder="Paste your choice from shadcn" onChange={event => { setPreset(event.target.value); setCopied(false); }} /><p className="mt-2 text-xs leading-5 text-muted-foreground">Included in the instructions you copy. Your agent saves the choices after you agree on a direction.</p></div>
        <p className="text-sm leading-6 text-muted-foreground">Have a design.md, brand font, or icon set? Give it to your agent alongside the preset. You can review foundations before adding components.</p>
      </div> : path === 'untitled' ? <div className="space-y-3"><h3 className="text-sm font-medium">Curate with Untitled UI</h3><p className="text-sm leading-6 text-muted-foreground">Tell your agent what you want to build and which components you need. It will review the theme, assets, and any licensed material with you.</p><a href="https://www.untitledui.com/react" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">Explore Untitled UI<ArrowUpRight className="size-3" aria-hidden /></a></div> : <div className="space-y-3"><h3 className="text-sm font-medium">Start with an assessment</h3><p className="text-sm leading-6 text-muted-foreground">Give your agent a repository, folder, or package with your React code. Include theme files, fonts, icons, images, and usage examples when available.</p><p className="text-sm leading-6 text-muted-foreground">Your agent will identify what can be reused, what needs adaptation, and a useful first stage. Theme and assets can arrive before components.</p></div>}
    </>}
    <div className="mt-5 flex flex-wrap items-center gap-3"><Button size="sm" onClick={() => void copy()}><Copy className="size-3" aria-hidden />{copied ? 'Instructions copied' : curation ? 'Copy continuation instructions' : 'Copy setup instructions'}</Button><span role="status" className="text-xs text-muted-foreground">{error || (copied ? 'Paste into your agent’s chat to continue.' : '')}</span></div>
    <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">View agent instructions</summary><p className="mt-3 select-text whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-6">{prompt}</p></details>
  </section>;
}
