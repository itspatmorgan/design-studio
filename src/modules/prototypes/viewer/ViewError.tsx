// Shown in place of a view that throws, with the error so it can be copied into a bug report or an agent chat.
import { useState } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/platform/systems/studio/components/button';

export default function ViewError({ error }: FallbackProps) {
  const [copied, setCopied] = useState(false);
  const message = error instanceof Error ? error.message : String(error);
  const copy = async () => {
    await navigator.clipboard.writeText((error instanceof Error && error.stack) || message);
    setCopied(true);
  };
  return (
    <div role='alert' className='max-w-2xl space-y-3 p-8'>
      <p className='text-sm font-medium'>This page couldn't load. Copy the error and give it to your agent.</p>
      <pre className='overflow-auto rounded-md bg-muted p-3 text-sm whitespace-pre-wrap text-muted-foreground'>
        {message}
      </pre>
      <Button variant='outline' size='sm' onClick={copy}>
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={14} />
        {copied ? 'Copied' : 'Copy error'}
      </Button>
    </div>
  );
}
