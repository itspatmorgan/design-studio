import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, FileEditIcon, Folder01Icon, Link01Icon, SourceCodeIcon } from '@hugeicons/core-free-icons';
import { shortcutLabel } from './artifactShortcuts';
import { ContextMenuItem, ContextMenuShortcut } from '@/platform/systems/studio/components/context-menu';
import { toast } from '@/platform/systems/studio/components/toast';

// Shared non-destructive actions for system content, prototype, and documentation files.
export function FileActionItems({
  path,
  group = 'all',
  href,
  edit,
  sourceLabel = 'Edit source',
  sourceShortcut = false,
  open,
  reveal,
}: {
  path: string;
  group?: 'all' | 'source' | 'utilities';
  href?: string;
  edit?: () => void;
  sourceLabel?: string;
  sourceShortcut?: boolean;
  open?: () => void;
  reveal?: () => void | Promise<unknown>;
}) {
  const run = (action: () => unknown) =>
    setTimeout(() => {
      Promise.resolve()
        .then(action)
        .catch(error =>
          toast.add({ type: 'error', title: error instanceof Error ? error.message : 'File action failed.' }),
        );
    });
  const copy = async (value: string, title: string) => {
    await navigator.clipboard.writeText(value);
    toast.add({ title });
  };
  return (
    <>
      {group !== 'utilities' && edit && (
        <ContextMenuItem onClick={() => run(edit)}>
          <HugeiconsIcon icon={SourceCodeIcon} /> {sourceLabel}
          {sourceShortcut && <ContextMenuShortcut>{shortcutLabel('source')}</ContextMenuShortcut>}
        </ContextMenuItem>
      )}
      {group !== 'source' && open && (
        <ContextMenuItem onClick={() => run(open)}>
          <HugeiconsIcon icon={FileEditIcon} /> Open in editor
        </ContextMenuItem>
      )}
      {group !== 'source' && reveal && (
        <ContextMenuItem onClick={() => run(reveal)}>
          <HugeiconsIcon icon={Folder01Icon} /> Reveal in Finder
        </ContextMenuItem>
      )}
      {group !== 'source' && href && (
        <ContextMenuItem onClick={() => run(() => copy(href, 'Link copied'))}>
          <HugeiconsIcon icon={Link01Icon} /> Copy link
        </ContextMenuItem>
      )}
      {group !== 'source' && (
        <ContextMenuItem onClick={() => run(() => copy(path, 'Path copied'))}>
          <HugeiconsIcon icon={Copy01Icon} /> Copy path
        </ContextMenuItem>
      )}
    </>
  );
}
