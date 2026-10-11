// The "…" on a prototype or section item's card: the same actions as its menu in the navigation
// (usePrototypeActions.ts). It shows when the pointer is over the card or focus is in it. Only what you
// may do is offered: everyone can copy the link, and the owner (or the section item's maintainers) can also change it.
// Place it beside the card's link, in a wrapper with the group class "card-wrap", not inside the link.
import { Fragment } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import type { PrototypeInfo } from '@/platform/app/data/types';
import { usePrototypeActions } from '@/modules/prototypes/viewer/usePrototypeActions';
import { menuGroups } from '@/platform/app/shell/menuGroups';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/platform/systems/studio/components/dropdown-menu';

// `triggerClassName` adds to the button's look, for a card whose top isn't a plain surface. By default it sits in the
// card's top right corner; `inline` leaves it where it is drawn, for a row that places it itself.
export default function PrototypeCardMenu({
  proto,
  triggerClassName,
  inline,
}: {
  proto: PrototypeInfo;
  triggerClassName?: string;
  inline?: boolean;
}) {
  const { groups, dialogs } = usePrototypeActions(proto);
  if (!menuGroups(groups).length) return null;
  return (
    <div className={inline ? undefined : 'absolute top-2 right-2'}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${proto.title}`}
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity outline-none hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/card-wrap:opacity-100 group-focus-within/card-wrap:opacity-100 data-[popup-open]:opacity-100 [@media(hover:none)]:opacity-100',
            triggerClassName,
          )}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='min-w-44'>
          {menuGroups(groups).map((group, g) => (
            <Fragment key={g}>
              {g > 0 && <DropdownMenuSeparator />}
              {/* Actions run after the menu has closed, so a dialog they open isn't closed by the same click. */}
              {group.map(a => (
                <DropdownMenuItem
                  key={a.label}
                  variant={a.destructive ? 'destructive' : 'default'}
                  onClick={() => setTimeout(a.onSelect)}
                >
                  <HugeiconsIcon icon={a.icon} /> {a.label}
                </DropdownMenuItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </div>
  );
}
