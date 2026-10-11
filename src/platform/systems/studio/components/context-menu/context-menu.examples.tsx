import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/platform/systems/studio/components/context-menu';

export const RightClick = () => (
  <ContextMenu>
    <ContextMenuTrigger className='flex h-24 w-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground'>
      Right-click here
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem>
        Rename<ContextMenuShortcut>F2</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem>Copy link</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant='destructive'>Move to Trash</ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
);
