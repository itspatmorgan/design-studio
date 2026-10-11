import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Card, CardContent } from '@/platform/systems/studio/components/card';
import { cn } from '@/lib/utils';

// The card for anything in a collection (a prototype, a section item), on each collection's index. Neutral on purpose: a tile with
// the module's icon, then the title, what it is, and a line of detail, so a team's theme is what gives it colour. `link` is
// a link from manifest.ts (prototypeLink). `menu` is drawn beside the link, not inside it (PrototypeCardMenu), so the card
// sits in a "card-wrap" group.
export function CollectionCard({
  link,
  icon,
  title,
  description,
  meta,
  archived,
  menu,
}: {
  link: object;
  icon: IconSvgElement;
  title: ReactNode;
  description?: string;
  meta?: ReactNode;
  archived?: boolean;
  menu?: ReactNode;
}) {
  return (
    <div className='group/card-wrap relative h-full'>
      <Link
        {...(link as { to: never })}
        className='block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      >
        <Card className={cn('h-full transition-colors hover:bg-muted/40', archived && 'opacity-60')}>
          <CardContent className='flex flex-1 flex-col gap-3'>
            <span className='grid size-8 place-items-center rounded-lg bg-muted text-foreground/70' aria-hidden>
              <HugeiconsIcon icon={icon} size={16} strokeWidth={1.75} />
            </span>
            <div className='grid gap-1'>
              <div className='text-sm font-semibold leading-snug text-foreground'>{title}</div>
              {description !== undefined && (
                <p className='line-clamp-2 text-xs leading-relaxed text-muted-foreground'>
                  {description || 'No description'}
                </p>
              )}
            </div>
            {meta && (
              <div className='mt-auto flex items-center gap-1.5 pt-0.5 text-xs text-muted-foreground'>{meta}</div>
            )}
          </CardContent>
        </Card>
      </Link>
      {menu}
    </div>
  );
}
