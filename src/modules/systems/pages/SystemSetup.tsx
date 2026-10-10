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
      <p className="mb-6 text-sm leading-6 text-muted-foreground">Use these choices to prepare a prompt, then paste it into your agent’s chat to start setup. Your agent builds the system with you. Return to Overview to review its work.</p>
      <Tabs value={path} onValueChange={value => setPath(value as typeof path)} className="gap-5">
        <div><h3 className="mb-3 text-sm font-semibold">1. Choose your starting point</h3>
          <TabsList aria-label="System starting point" className="max-w-full overflow-x-auto">
            <TabsTrigger value="shadcn">shadcn/ui</TabsTrigger>
            <TabsTrigger value="untitled">Untitled UI</TabsTrigger>
            <TabsTrigger value="import">Your React system</TabsTrigger>
          </TabsList>
        </div>
        {(['shadcn', 'untitled', 'import'] as const).map(id => <TabsContent key={id} value={id} className="space-y-4 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">2. {id === 'import' ? 'Point to your existing system' : 'Describe your starting direction'}</h3>
          {id === 'shadcn' ? <>
            <p className="text-sm leading-6 text-muted-foreground">Explore themes, fonts, icons, and styles in shadcn’s builder, then paste your preset below. You can leave it blank and ask your agent to recommend a direction.</p>
            <Button variant="outline" size="sm" render={<a href="https://ui.shadcn.com/create" target="_blank" rel="noreferrer" />}>Open shadcn builder<ArrowUpRight className="size-3" aria-hidden /></Button>
            <div><label htmlFor="curation-preset" className="mb-2 block text-sm font-medium">Preset code or builder link <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="curation-preset" value={preset} placeholder="Paste your choice from shadcn" onChange={event => setPreset(event.target.value)} /></div>
          </> : id === 'untitled' ? <>
            <p className="text-sm leading-6 text-muted-foreground">Describe what you want to build and the components you need. Your agent will review the theme, assets, and access to licensed material with you.</p>
            <a href="https://www.untitledui.com/react" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">Explore Untitled UI<ArrowUpRight className="size-3" aria-hidden /></a>
          </> : <p className="text-sm leading-6 text-muted-foreground">Start with an assessment of your React code. Your agent will identify what can be reused and propose a staged import. Theme and assets can arrive before components.</p>}
          <div><label htmlFor={'curation-materials-' + id} className="mb-2 block text-sm font-medium">{id === 'import' ? 'Repository, files, and goals' : 'Goals and additional materials'} <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea id={'curation-materials-' + id} value={materials[id]} rows={3} placeholder={id === 'import' ? 'Repository URL or local folder, theme files, usage examples, and what to bring in first' : 'What you want to build, a design.md path, fonts, icons, or brand guidelines'} onChange={event => setMaterials(previous => ({ ...previous, [id]: event.target.value }))} />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">These notes go into your prompt. Add links or file paths here. Attach any files directly in the agent chat when you send it.</p>
          </div>
        </TabsContent>)}
      </Tabs>
    </>}
    <div className="mt-6 border-t border-border pt-5">
      <h3 className="text-sm font-semibold">{curation ? 'Continue in your agent chat' : '3. Copy and send your prompt'}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{curation ? 'Paste this prompt into your agent’s chat to take the next step.' : 'The prompt below includes your choices. Copy it into your agent’s chat, attach any files, and send it to begin.'}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3"><Button size="sm" onClick={() => void copy()}><Copy className="size-3" aria-hidden />{copied ? 'Prompt copied' : curation ? 'Copy continuation prompt' : 'Copy setup prompt'}</Button><span role="status" className="text-xs text-muted-foreground">{error || (copied ? 'Paste into your agent’s chat and send to continue.' : '')}</span></div>
      <details className="mt-4 text-sm" open={!curation}><summary className="cursor-pointer text-muted-foreground">{curation ? 'View continuation prompt' : 'Your setup prompt'}</summary><p className="mt-3 select-text whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-6">{prompt}</p></details>
    </div>
  </section>;
}
