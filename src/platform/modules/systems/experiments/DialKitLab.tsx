import { useState, type CSSProperties } from 'react';
import { DialRoot, useDialKitController, type DialConfig } from 'dialkit';
import 'dialkit/styles.css';
import { Button } from '@/systems/product/components/button';
import { SystemFrame, useColorMode } from '../pages/foundations';

// This adapter intentionally targets one component. Values never mutate shared tokens.
const config = {
  height: [32, 24, 64, 1],
  padding: [10, 0, 40, 1],
  radius: [0, 0, 32, 1],
  duration: [150, 0, 800, 10],
} satisfies DialConfig;

export default function DialKitLab() {
  const mode = useColorMode();
  const controls = useDialKitController('Product button', config, {
    // Omitting a stable id also disables DialKit's in-memory retention on unmount.
    persist: false,
  });
  const { values } = controls;
  const [disabled, setDisabled] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [copied, setCopied] = useState(false);
  const style: CSSProperties = {
    height: values.height,
    paddingInline: values.padding,
    borderRadius: values.radius,
    transitionDuration: `${values.duration}ms`,
  };
  const proposal = JSON.stringify(
    {
      system: 'product',
      component: 'button',
      scope: 'component-only preview override',
      style,
    },
    null,
    2,
  );

  return (
    <section aria-label='DialKit experiment' className='mt-12 space-y-4'>
      <h2 className='text-lg font-semibold'>Tune Button</h2>
      <p className='text-sm text-muted-foreground'>
        Experiment · Component-only values. Shared theme tokens and source stay unchanged. Copy a proposal to bring your
        choices back to the agent. Leaving this page discards tuning.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' }}>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <SystemFrame>
            <div
              className='flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-6'
              data-dialkit-preview
            >
              <Button style={style} disabled={disabled} onClick={() => setClicks(count => count + 1)}>
                Primary
              </Button>
              <Button style={style} disabled={disabled} variant='outline' onClick={() => setClicks(count => count + 1)}>
                Outline
              </Button>
              <Button
                style={style}
                disabled={disabled}
                variant='secondary'
                onClick={() => setClicks(count => count + 1)}
              >
                Secondary
              </Button>
            </div>
          </SystemFrame>
          <p className='mt-4 text-sm' aria-live='polite'>
            Preview clicks: {clicks}
          </p>
          <div className='mt-4 flex flex-wrap items-center gap-3'>
            <label className='text-sm'>
              <input type='checkbox' checked={disabled} onChange={event => setDisabled(event.target.checked)} />{' '}
              Disabled state
            </label>
            <Button
              variant='outline'
              onClick={() => {
                controls.resetValues();
                setCopied(false);
              }}
            >
              Reset tuning
            </Button>
            <Button
              variant='outline'
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(proposal);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? 'Proposal copied' : 'Copy proposal'}
            </Button>
          </div>
          <pre
            aria-label='Tuning proposal'
            className='mt-4 overflow-x-auto rounded-lg border border-border p-4 text-xs'
          >
            {proposal}
          </pre>
        </div>
        <div style={{ flex: '0 1 320px', maxWidth: '100%', minWidth: 0 }}>
          <DialRoot mode='inline' theme={mode === 'dark' ? 'dark' : 'light'} defaultOpen versions='menu' />
        </div>
      </div>
    </section>
  );
}
