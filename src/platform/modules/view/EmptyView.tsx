// What a view shows until something is built in it (its file exports emptyView, src/lib/emptyView.ts): a quiet
// page that says so, with a prompt to hand your agent. It's the platform's page, so it looks the same
// whichever design system the prototype uses.
import { useState } from 'react';
import { Button } from '@/platform/systems/studio/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/platform/systems/studio/components/empty';

// `path` is the view's path in the repo, like "src/prototypes/patrick/checkout/review.tsx". Only known in dev: the
// deployed site has no source to point at.
export default function EmptyView({ path }: { path: string | null }) {
  const prompt = path ? `In ${path}, build ` : '';
  const [copied, setCopied] = useState(false);
  return (
    <div className='flex min-h-full items-center justify-center p-8'>
      <Empty className='max-w-md flex-none border py-10'>
        <EmptyHeader>
          <EmptyTitle>This view is empty</EmptyTitle>
          <EmptyDescription>
            Ask your agent to build something here. Describe what it's for and who it's for.
          </EmptyDescription>
        </EmptyHeader>
        {path && (
          <EmptyContent className='max-w-none flex-row items-center gap-2 rounded-lg bg-muted py-1.5 pr-1.5 pl-3 text-left'>
            {/* The full path is copied; the shorter one (prototype/file) fits the frame. */}
            <code className='min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground' title={prompt}>
              In{' '}
              {path
                .split('/')
                .slice(path.startsWith('src/prototypes/') ? 3 : 2)
                .join('/')}
              , build
            </code>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => {
                navigator.clipboard.writeText(prompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? 'Copied' : 'Copy prompt'}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    </div>
  );
}
