import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/systems/studio/components/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/systems/studio/components/tabs';
import { Textarea } from '@/systems/studio/components/textarea';
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
  const [materials, setMaterials] = useState({ shadcn: '', untitled: '', import: '' });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const prompt = curationPrompt({ system, label, path, preset, materials: materials[path], curation });
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
    <div className="mb-4 flex items-center gap-2"><Sparkles className="size-4 text-muted-foreground" aria-hidden /><h2 id="system-curation" className="text-lg font-semibold tracking-tight">{curation ? 'Build your system' : 'Prepare your setup prompt'}</h2></div>
    {curation ? <>
      {curation.stage === 'assessment' ? <p className="mb-3 text-xs font-medium text-muted-foreground">Assessing existing React code</p> : <ol className="mb-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Curation stages">{curationStages.map(stage => <li key={stage.id} aria-current={stage.id === curation.stage ? 'step' : undefined} className={`flex items-center gap-2 text-xs ${stage.id === curation.stage ? 'font-medium text-foreground' : 'text-muted-foreground'}`}><span aria-hidden className={`size-1.5 rounded-full ${stage.id === curation.stage ? 'bg-foreground' : 'bg-muted-foreground/40'}`} />{stage.label}</li>)}</ol>}
      <p className="text-sm leading-6">{curation.summary}</p>
      {sources.length > 0 && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">{source.label}<ArrowUpRight className="size-3" aria-hidden /></a>)}</div>}
      {review.length > 0 || prototype ? <div className="mt-5 space-y-2"><p className="text-xs font-medium text-muted-foreground">Review in Studio</p><div className="flex flex-wrap gap-2">{review.map(item => <Button key={item.path} variant="outline" size="sm" render={<Link to={(systemPath(system) + '/' + item.path) as never} />}>{item.label}<ArrowUpRight className="size-3" aria-hidden /></Button>)}{prototype && <Button variant="outline" size="sm" render={<Link {...prototypeLink(prototype)} />}>Try {prototype.title}<ArrowUpRight className="size-3" aria-hidden /></Button>}</div></div> : null}
      <div className="mt-5 border-t border-border pt-4"><p className="mb-1 text-xs font-medium text-muted-foreground">Next with your agent</p><p className="text-sm leading-6">{curation.nextStep}</p></div>
    </> : <>
      <Tabs value={path} onValueChange={value => setPath(value as typeof path)} className="gap-5">
        <div><h3 className="mb-3 text-sm font-semibold">1. Choose your starting point</h3>
          <TabsList aria-label="System starting point" className="max-w-full overflow-x-auto">
            <TabsTrigger value="shadcn">shadcn/ui</TabsTrigger>
            <TabsTrigger value="untitled">Untitled UI</TabsTrigger>
            <TabsTrigger value="import">Your React system</TabsTrigger>
          </TabsList>
        </div>
        {(['shadcn', 'untitled', 'import'] as const).map(id => <TabsContent key={id} value={id} className="space-y-4 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">2. {id === 'shadcn' ? 'Choose a shadcn preset' : id === 'import' ? 'Point to your existing system' : 'Describe your toolkit'}</h3>
          {id === 'shadcn' ? <>
            <p className="text-sm leading-6 text-muted-foreground">Open shadcn’s builder, customize your system, and copy its preset. Then return here and paste it below.</p>
            <Button variant="outline" size="sm" render={<a href="https://ui.shadcn.com/create" target="_blank" rel="noreferrer" />}>Open shadcn builder<ArrowUpRight className="size-3" aria-hidden /></Button>
            <div><label htmlFor="curation-preset" className="mb-2 block text-sm font-medium">Paste your preset here</label><Input id="curation-preset" value={preset} placeholder="Preset code or builder link" onChange={event => setPreset(event.target.value)} /></div>
          </> : id === 'untitled' ? <>
            <p className="text-sm leading-6 text-muted-foreground">Choose components from Untitled UI, then describe what you need below.</p>
            <a href="https://www.untitledui.com/react" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">Explore Untitled UI<ArrowUpRight className="size-3" aria-hidden /></a>
          </> : <p className="text-sm leading-6 text-muted-foreground">Link your React code below. Your agent will assess it and propose an import plan.</p>}
          <div><label htmlFor={'curation-materials-' + id} className="mb-2 block text-sm font-medium">{id === 'import' ? 'Repository or folder' : 'What do you want to build?'} <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea id={'curation-materials-' + id} value={materials[id]} rows={3} placeholder={id === 'import' ? 'Paste a repository URL or the full path to your React project folder' : 'For example: A dashboard for tracking customer support requests'} onChange={event => setMaterials(previous => ({ ...previous, [id]: event.target.value }))} />
            {id !== 'import' && <p className="mt-2 text-xs text-muted-foreground">Your agent uses this to choose the first components.</p>}
          </div>
        </TabsContent>)}
      </Tabs>
    </>}
    <div className="mt-6 border-t border-border pt-5">
      <h3 className="text-sm font-semibold">{curation ? 'Continue in your agent chat' : '3. Copy and send your prompt'}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{curation ? 'Paste this into your agent’s chat and send.' : 'Paste this into your agent’s chat and send. Your agent will ask for any files it needs.'}</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h4 className="text-sm font-medium">{curation ? 'Your continuation prompt' : 'Your setup prompt'}</h4>
          <Button variant="outline" size="sm" onClick={() => void copy()}><Copy className="size-3" aria-hidden />{copied ? 'Prompt copied' : 'Copy prompt'}</Button>
        </div>
        <p className="select-text whitespace-pre-wrap p-4 text-sm leading-6">{prompt}</p>
      </div>
      <p role="status" className="mt-2 text-xs text-muted-foreground">{error || (copied ? 'Paste into your agent’s chat and send to continue.' : '')}</p>
    </div>
  </section>;
}
