import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

// One line of grey text for a section with nothing in it yet, on the same left edge as the headings above it.
export function HomeHint({ children }: { children: ReactNode }) {
  return <p className='px-2 py-1.5 text-sm text-muted-foreground'>{children}</p>;
}

// A block of the front page's panel, set apart from the next by space, not a line: a heading that links to the module's own page (the chevron says so), then
// the rows the module chose to show (ItemRow.tsx). A module's `overview` (src/platform/app/modules.ts) draws one of these.
export function HomeSection({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <section className='px-2 py-2'>
      <h2 className='px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground'>
        <Link
          to={to as never}
          className='group/title -mx-1 inline-flex items-center gap-0.5 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
        >
          {title}
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={12}
            className='transition-transform group-hover/title:translate-x-0.5 motion-reduce:transition-none'
          />
        </Link>
      </h2>
      {children}
    </section>
  );
}
