import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/platform/systems/studio/components/item';
import { cn } from '@/lib/utils';

// The row for anything in a section: on the front page (HomeSection.tsx) and in a collection's list view (Collection.tsx). It is
// the design system's Item, rendered as a link, with a neutral tile holding the module's rail icon, so all of a section's
// rows look alike. `link` is a link from manifest.ts (prototypeLink, artifactLink). `menu` is drawn beside the link
// (PrototypeCardMenu, inline), so the row sits in a "card-wrap" group.
export function ItemRow({
  link,
  icon,
  title,
  meta,
  archived,
  menu,
}: {
  link: object;
  icon: IconSvgElement;
  title: string;
  meta?: ReactNode;
  archived?: boolean;
  menu?: ReactNode;
}) {
  return (
    <li className={cn('group/card-wrap relative', archived && 'opacity-60')}>
      <Item size='xs' className='pr-10 pl-[7px]' render={<Link {...(link as { to: never })} />}>
        <ItemMedia variant='icon' className='size-7 rounded-md bg-muted text-foreground/70'>
          <HugeiconsIcon icon={icon} size={15} strokeWidth={1.75} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className='min-w-0'>
            <span className='truncate'>{title}</span>
            {meta && <span className='shrink-0 text-xs font-normal text-muted-foreground'>{meta}</span>}
          </ItemTitle>
        </ItemContent>
      </Item>
      {/* Centred on the row's height, and as far from the row's edge as the tile is on the other side. The tile's left edge is
          also the left edge of the section headings and the search above: the section's 8px, the Item's 1px border, then 7px. */}
      {menu && <div className='absolute top-1/2 right-2 -translate-y-1/2'>{menu}</div>}
    </li>
  );
}
