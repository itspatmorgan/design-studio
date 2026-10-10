import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, CircleHelp, Copy } from 'lucide-react';
import { Button, buttonVariants } from '@/systems/studio/components/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/systems/studio/components/tabs';
import { Textarea } from '@/systems/studio/components/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/systems/studio/components/tooltip';
import presetHelpImage from '../assets/shadcn-preset-help.png';
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
  const [path, setPath] = useState<'shadcn' | 'import'>('shadcn');
  const [preset, setPreset] = useState('');
  const [designMd, setDesignMd] = useState('');
  const [materials, setMaterials] = useState({ shadcn: '', import: '' });
  const [components, setComponents] = useState({ shadcn: '', import: '' });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const prompt = curationPrompt({ system, label, path, preset, designMd, materials: materials[path], components: components[path], curation });
  useEffect(() => { setCopied(false); setError(''); }, [prompt]);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setError(''); }
    catch { setError('Could not copy. Select the prompt below and paste it into your agent’s chat.'); }
  }
  const sources = curation?.sources.flatMap(source => {
    const url = sourceUrl(source.url);
    return url ? [{ ...source, url }] : [];
  }) ?? [];
  const block = 'min-w-0 rounded-xl border border-border/50 bg-muted/40 p-6';
  const heading = 'mb-4 text-lg font-semibold tracking-tight';
  return <div className="mb-6 grid gap-4">
    {curation ? <section className={block} aria-labelledby="system-curation">
      <h2 id="system-curation" className={heading}>Build your system</h2>
      {curation.stage === 'assessment' ? <p className="mb-3 text-xs font-medium text-muted-foreground">Assessing existing React code</p> : <ol className="mb-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Curation stages">{curationStages.map(stage => <li key={stage.id} aria-current={stage.id === curation.stage ? 'step' : undefined} className={`flex items-center gap-2 text-xs ${stage.id === curation.stage ? 'font-medium text-foreground' : 'text-muted-foreground'}`}><span aria-hidden className={`size-1.5 rounded-full ${stage.id === curation.stage ? 'bg-foreground' : 'bg-muted-foreground/40'}`} />{stage.label}</li>)}</ol>}
      <p className="text-sm leading-6">{curation.summary}</p>
      {sources.length > 0 && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">{source.label}<ArrowUpRight className="size-3" aria-hidden /></a>)}</div>}
      {review.length > 0 || prototype ? <div className="mt-5 space-y-2"><p className="text-xs font-medium text-muted-foreground">Review in Studio</p><div className="flex flex-wrap gap-2">{review.map(item => <Link key={item.path} to={(systemPath(system) + '/' + item.path) as never} className={buttonVariants({ variant: "outline", size: "sm" })}>{item.label}<ArrowUpRight className="size-3" aria-hidden /></Link>)}{prototype && <Link {...prototypeLink(prototype)} className={buttonVariants({ variant: "outline", size: "sm" })}>Try {prototype.title}<ArrowUpRight className="size-3" aria-hidden /></Link>}</div></div> : null}
      <div className="mt-5 pt-4"><p className="mb-1 text-xs font-medium text-muted-foreground">Next with your agent</p><p className="text-sm leading-6">{curation.nextStep}</p></div>
    </section> : <>
      <Tabs value={path} onValueChange={value => setPath(value as typeof path)} className="gap-4">
        <section className={block} aria-labelledby="system-starting-point"><h2 id="system-starting-point" className={heading}>1. Choose your system foundation</h2>
          <TabsList aria-label="System starting point" className="max-w-full overflow-x-auto">
            <TabsTrigger value="shadcn">Curate from shadcn</TabsTrigger>
            <TabsTrigger value="import">Bring your own</TabsTrigger>
          </TabsList>
        </section>
        <section className={block} aria-labelledby="system-choices">
          <h2 id="system-choices" className={heading}>2. Add your setup details</h2>
        {(['shadcn', 'import'] as const).map(id => <TabsContent key={id} value={id} className="space-y-4">
          {id === 'shadcn' ? <>
            <p className="text-sm leading-6 text-muted-foreground">Bring a preset from shadcn’s builder, a DESIGN.md, or both.</p>
            <a href="https://ui.shadcn.com/create" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "default", size: "sm" })}>Open shadcn builder<ArrowUpRight className="size-3" aria-hidden /></a>
            <div><div className="mb-2 flex items-center gap-2"><label htmlFor="curation-preset" className="text-sm font-medium">Paste your preset here</label>
              <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Where to find your shadcn preset" />}><CircleHelp className="size-4" aria-hidden /></TooltipTrigger>
                <TooltipContent side="top" className="block max-w-64 p-3">
                  <p className="mb-3 leading-5">Find <strong>--preset</strong> at the bottom of shadcn’s sidebar. Paste that code here.</p>
                  <img src={presetHelpImage} width={192} height={194} alt="Bottom of shadcn’s builder sidebar showing the --preset b0 control above Open Preset and Shuffle." className="mx-auto rounded-md" />
                </TooltipContent>
              </Tooltip>
            </div><Input id="curation-preset" value={preset} placeholder="Preset code or builder link" onChange={event => setPreset(event.target.value)} /></div>
            <div><label htmlFor="curation-design-md" className="mb-2 block text-sm font-medium">DESIGN.md <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Input id="curation-design-md" value={designMd} placeholder="Paste a link or the full path to your DESIGN.md" onChange={event => setDesignMd(event.target.value)} />
            </div>
          </> : <p className="text-sm leading-6 text-muted-foreground">Your agent will inspect the code and recommend what to import first, what needs adaptation, and what’s missing.</p>}
          <div><label htmlFor={'curation-materials-' + id} className="mb-2 block text-sm font-medium">{id === 'import' ? 'React project or component library' : 'What do you want to build?'} <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea id={'curation-materials-' + id} value={materials[id]} rows={3} placeholder={id === 'import' ? 'Paste a repository URL or the full path to its folder' : 'For example: A dashboard for tracking customer support requests'} onChange={event => setMaterials(previous => ({ ...previous, [id]: event.target.value }))} />
            <p className="mt-2 text-xs text-muted-foreground">{id === 'import' ? 'Leave this blank and your agent will ask for the source in chat.' : 'Your agent uses this to choose the first components.'}</p>
          </div>
          {id !== 'import' && <div>
            <label htmlFor={'curation-components-' + id} className="mb-2 block text-sm font-medium">Any components you already know you want? <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea rows={3} id={'curation-components-' + id} value={components[id]} placeholder="For example: Buttons, a data table, and a date picker" onChange={event => setComponents(previous => ({ ...previous, [id]: event.target.value }))} />
          </div>}
        </TabsContent>)}
        </section>
      </Tabs>
    </>}
    <section className={block} aria-labelledby="system-prompt">
      <h2 id="system-prompt" className={heading}>{curation ? 'Your continuation prompt' : '3. Copy and send your prompt'}</h2>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">{curation ? 'Paste this into your agent’s chat and send.' : 'Paste this into your agent’s chat and send. Your agent will ask for any files it needs.'}</p>
      <p className="select-text whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm leading-6">{prompt}</p>
      <Button className="mt-4" onClick={() => void copy()}><Copy className="size-4" aria-hidden />{copied ? 'Prompt copied' : 'Copy prompt'}</Button>
      <p role="status" className="mt-2 text-xs text-muted-foreground">{error || (copied ? 'Paste into your agent’s chat and send to continue.' : '')}</p>
    </section>
  </div>;
}
