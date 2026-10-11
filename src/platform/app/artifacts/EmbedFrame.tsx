import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { SquareArrowExpand01Icon } from '@hugeicons/core-free-icons';
import { artifactLabel, artifactLink } from '@/platform/app/data/manifest';
import type { Artifact, Prototype } from '@/platform/app/data/types';
import { cn } from '@/lib/utils';

export const EMBED_HEADER_HEIGHT = 36;

// One frame and opening interaction for previews across documents and canvases.
export default function EmbedFrame({
  proto,
  item,
  label,
  children,
  className,
}: {
  proto?: Prototype;
  item?: Artifact;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  const title = label ?? (item ? artifactLabel(item.path) : 'File');
  const contents = (
    <>
      <span className='truncate font-semibold'>{title}</span>
      <span className='inline-flex shrink-0 items-center gap-1.5 font-medium'>
        <span className='opacity-0 transition-opacity group-hover/open:text-primary group-hover/open:opacity-100 group-focus-visible/open:text-primary group-focus-visible/open:opacity-100'>
          Open
        </span>
        <HugeiconsIcon
          icon={SquareArrowExpand01Icon}
          size={16}
          className='text-muted-foreground transition-colors group-hover/open:text-primary group-focus-visible/open:text-primary'
        />
      </span>
    </>
  );
  const headerClass =
    'group/open flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 text-xs text-foreground no-underline transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
  return (
    <div
      data-canvas-frame=''
      style={{ borderRadius: 'var(--radius, 0.5rem)' }}
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background',
        className,
      )}
    >
      {proto && item ? (
        <Link
          {...artifactLink(proto, item)}
          data-open
          aria-label={`Open ${title}`}
          className={headerClass}
          style={{ height: EMBED_HEADER_HEIGHT }}
        >
          {contents}
        </Link>
      ) : (
        <div
          className='flex shrink-0 items-center border-b border-border bg-muted/60 px-3 text-xs font-semibold'
          style={{ height: EMBED_HEADER_HEIGHT }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
