import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleHelp, Copy } from 'lucide-react';
import { Button, buttonVariants } from '@/platform/systems/studio/components/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/platform/systems/studio/components/tabs';
import { Textarea } from '@/platform/systems/studio/components/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/platform/systems/studio/components/tooltip';
import presetHelpImage from '../assets/shadcn-preset-help.png';
import { Input } from '@/platform/systems/studio/components/input';
import { curationPrompt } from '../curation';

type Props = { system: string; label: string };

export default function SystemSetup({ system, label }: Props) {
  const [path, setPath] = useState<'shadcn' | 'import'>('shadcn');
  const [preset, setPreset] = useState('');
  const [designMd, setDesignMd] = useState('');
  const [materials, setMaterials] = useState({ shadcn: '', import: '' });
  const [components, setComponents] = useState({ shadcn: '', import: '' });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const prompt = curationPrompt({
    system,
    label,
    path,
    preset,
    designMd,
    materials: materials[path],
    components: components[path],
  });
  useEffect(() => {
    setCopied(false);
    setError('');
  }, [prompt]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setError('');
    } catch {
      setError('Could not copy. Select the prompt below and paste it into your agent’s chat.');
    }
  }
  const block = 'min-w-0 rounded-xl border border-border/50 bg-muted/40 p-6';
  const heading = 'mb-4 text-lg font-semibold tracking-tight';
  return (
    <div className='mb-6 grid gap-4'>
      <Tabs value={path} onValueChange={value => setPath(value as typeof path)} className='gap-4'>
        <section className={block} aria-labelledby='system-starting-point'>
          <h2 id='system-starting-point' className={heading}>
            1. Choose your system foundation
          </h2>
          <TabsList aria-label='System starting point' className='max-w-full overflow-x-auto'>
            <TabsTrigger value='shadcn'>Curate from shadcn</TabsTrigger>
            <TabsTrigger value='import'>Bring your own</TabsTrigger>
          </TabsList>
        </section>
        <section className={block} aria-labelledby='system-choices'>
          <h2 id='system-choices' className={heading}>
            2. Add your setup details
          </h2>
          {(['shadcn', 'import'] as const).map(id => (
            <TabsContent key={id} value={id} className='space-y-4'>
              {id === 'shadcn' ? (
                <>
                  <p className='text-sm leading-6 text-muted-foreground'>
                    Bring a preset from shadcn’s builder, a DESIGN.md, or both.
                  </p>
                  <a
                    href='https://ui.shadcn.com/create'
                    target='_blank'
                    rel='noreferrer'
                    className={buttonVariants({ variant: 'default', size: 'sm' })}
                  >
                    Open shadcn builder
                    <ArrowUpRight className='size-3' aria-hidden />
                  </a>
                  <div>
                    <div className='mb-2 flex items-center gap-2'>
                      <label htmlFor='curation-preset' className='text-sm font-medium'>
                        Paste your preset here
                      </label>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button variant='ghost' size='icon-sm' aria-label='Where to find your shadcn preset' />
                          }
                        >
                          <CircleHelp className='size-4' aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent side='top' className='block max-w-64 p-3'>
                          <p className='mb-3 leading-5'>
                            Find <strong>--preset</strong> at the bottom of shadcn’s sidebar. Paste that code here.
                          </p>
                          <img
                            src={presetHelpImage}
                            width={192}
                            height={194}
                            alt='Bottom of shadcn’s builder sidebar showing the --preset b0 control above Open Preset and Shuffle.'
                            className='mx-auto rounded-md'
                          />
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id='curation-preset'
                      value={preset}
                      placeholder='Preset code or builder link'
                      onChange={event => setPreset(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor='curation-design-md' className='mb-2 block text-sm font-medium'>
                      DESIGN.md <span className='font-normal text-muted-foreground'>(optional)</span>
                    </label>
                    <Input
                      id='curation-design-md'
                      value={designMd}
                      placeholder='Paste a link or the full path to your DESIGN.md'
                      onChange={event => setDesignMd(event.target.value)}
                    />
                  </div>
                </>
              ) : (
                <p className='text-sm leading-6 text-muted-foreground'>
                  Your agent will inspect the code and recommend what to import first, what needs adaptation, and what’s
                  missing.
                </p>
              )}
              <div>
                <label htmlFor={'curation-materials-' + id} className='mb-2 block text-sm font-medium'>
                  {id === 'import' ? 'React project or component library' : 'What do you want to build?'}{' '}
                  <span className='font-normal text-muted-foreground'>(optional)</span>
                </label>
                <Textarea
                  id={'curation-materials-' + id}
                  value={materials[id]}
                  rows={3}
                  placeholder={
                    id === 'import'
                      ? 'Paste a repository URL or the full path to its folder'
                      : 'For example: A dashboard for tracking customer support requests'
                  }
                  onChange={event => setMaterials(previous => ({ ...previous, [id]: event.target.value }))}
                />
                <p className='mt-2 text-xs text-muted-foreground'>
                  {id === 'import'
                    ? 'Leave this blank and your agent will ask for the source in chat.'
                    : 'Your agent uses this to choose the first components.'}
                </p>
              </div>
              {id !== 'import' && (
                <div>
                  <label htmlFor={'curation-components-' + id} className='mb-2 block text-sm font-medium'>
                    Any components you already know you want?{' '}
                    <span className='font-normal text-muted-foreground'>(optional)</span>
                  </label>
                  <Textarea
                    rows={3}
                    id={'curation-components-' + id}
                    value={components[id]}
                    placeholder='For example: Buttons, a data table, and a date picker'
                    onChange={event => setComponents(previous => ({ ...previous, [id]: event.target.value }))}
                  />
                </div>
              )}
            </TabsContent>
          ))}
        </section>
      </Tabs>
      <section className={block} aria-labelledby='system-prompt'>
        <h2 id='system-prompt' className={heading}>
          3. Copy and send your prompt
        </h2>
        <p className='mb-4 text-sm leading-6 text-muted-foreground'>
          Paste this into your agent’s chat and send. Your agent will ask for any files it needs.
        </p>
        <p className='select-text whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm leading-6'>
          {prompt}
        </p>
        <Button className='mt-4' onClick={() => void copy()}>
          <Copy className='size-4' aria-hidden />
          {copied ? 'Prompt copied' : 'Copy prompt'}
        </Button>
        <p role='status' className='mt-2 text-xs text-muted-foreground'>
          {error || (copied ? 'Paste into your agent’s chat and send to continue.' : '')}
        </p>
      </section>
    </div>
  );
}
