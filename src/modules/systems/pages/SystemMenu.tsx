import { Fragment, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Delete02Icon,
  FileEditIcon,
  Folder01Icon,
  Link01Icon,
  Archive02Icon,
  ArchiveRestoreIcon,
  Copy01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { menuGroups } from '@/platform/app/shell/menuGroups';
import { callModule, useMe } from '@/platform/app/data/files';
import { CONFIG } from '@/platform/app/data/config';
import { useManifest } from '@/platform/app/data/useManifest';
import { prototypeLink } from '@/platform/app/data/manifest';
import { Button } from '@/platform/systems/studio/components/button';
import { Input } from '@/platform/systems/studio/components/input';
import { toast } from '@/platform/systems/studio/components/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/platform/systems/studio/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/platform/systems/studio/components/dropdown-menu';
import { beginSystemDeletion, finishSystemCreation } from './creationTransition';
import { canPerform } from '@/platform/core/permissions';
import { DEFAULT_SYSTEM, SYSTEM_SPECS, systemPath } from '../data/systems';
import { systemFolder } from '@/platform/core/roots';

export const systemRequest = <T,>(action: string, system?: string, extra: object = {}) =>
  callModule<T>('systems', 'action', { action, system, ...extra });
type Action = {
  label: string;
  icon: typeof Link01Icon;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export default function SystemMenu({
  system,
  variant = 'header',
}: {
  system: string;
  variant?: 'header' | 'card' | 'row';
}) {
  const navigate = useNavigate();
  const manifest = useManifest();
  const me = useMe();
  const spec = SYSTEM_SPECS[system];
  const local = import.meta.env.DEV && !!me;
  const admin = local && (CONFIG.usage === 'personal' || CONFIG.admins?.includes(me!));
  const maintain =
    local &&
    canPerform(
      CONFIG,
      me,
      me ? [me] : [],
      { kind: 'system', id: system, role: spec.role, status: spec.status },
      'rename',
    );
  const editable = admin && spec.role === 'prototype';
  const [dialog, setDialog] = useState<'rename' | 'archive' | 'restore' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const dependents = [...manifest.prototypes, ...Object.values(manifest.sections).flat()].filter(
    proto => proto.system === system || proto.rebuild?.targetSystemKey === system,
  );
  const archiveTargets = dependents.filter(proto => proto.status !== 'archived');
  const defaultArchive = dialog === 'archive' && system === DEFAULT_SYSTEM;

  async function run(action: string) {
    try {
      const result = await systemRequest<{ message?: string }>(action, system);
      // The configuration watcher refreshes this same URL with the new default.
      // Deliver confirmation after that refresh rather than competing with it.
      if (action === 'default')
        sessionStorage.setItem(
          'studio:system-action',
          JSON.stringify({ title: `${spec.label} is now the default system.` }),
        );
      else if (result.message) toast.add({ title: result.message });
    } catch (e) {
      toast.add({ type: 'error', title: (e as Error).message });
    }
  }
  async function openAction(action: 'archive' | 'restore' | 'delete') {
    setDialog(action);
    setError('');
    setAllowed(false);
    setChecking(true);
    if (action === 'archive' && system === DEFAULT_SYSTEM) {
      setChecking(false);
      return;
    }
    try {
      await systemRequest(`${action}-check`, system);
      setAllowed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  async function save(name?: string, restorePrototypes = false) {
    if (busy) return;
    const action = dialog!;
    const previousUrl = location.href;
    setBusy(true);
    setError('');
    if (action === 'delete') {
      setDialog(null);
      beginSystemDeletion(spec.label, system);
    }
    try {
      // Keep reloads during a folder move or deletion on a stable route.
      if (action !== 'delete') await navigate({ to: '/systems' as never });
      await systemRequest<{ id: string; references: number }>(action, system, { name, restorePrototypes });
      sessionStorage.setItem(
        'studio:system-action',
        JSON.stringify({
          title:
            action === 'rename'
              ? 'System renamed. References updated.'
              : action === 'archive'
                ? 'System and associated prototypes archived.'
                : action === 'restore'
                  ? 'System restored.'
                  : 'System deleted. Associated prototypes need a rebuild.',
        }),
      );
      // Deletion's configuration restart opens the updated index behind the transition.
      if (action === 'delete') return;
      window.location.assign(action === 'archive' ? '/systems' : systemPath(system));
    } catch (e) {
      if (action === 'delete') {
        window.history.replaceState(null, '', previousUrl);
        finishSystemCreation();
        setDialog('delete');
      }
      toast.add({ type: 'error', title: (e as Error).message });
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        new URL(import.meta.env.BASE_URL.replace(/\/$/, '') + systemPath(system), location.origin).href,
      );
      toast.add({ title: 'Link copied' });
    } catch {
      toast.add({ type: 'error', title: 'Could not copy the link.' });
    }
  }
  async function copyPath() {
    try {
      await navigator.clipboard.writeText(`src/${systemFolder(system)}/`);
      toast.add({ title: 'Path copied' });
    } catch {
      toast.add({ type: 'error', title: 'Could not copy the path.' });
    }
  }
  // Match prototype menus: reach it; change it; delete it, last and alone.
  const groups = menuGroups<Action>(
    spec.status === 'archived'
      ? [
          [editable && { label: 'Restore', icon: ArchiveRestoreIcon, onSelect: () => void openAction('restore') }],
          [
            editable && {
              label: 'Delete',
              icon: Delete02Icon,
              onSelect: () => void openAction('delete'),
              destructive: true,
            },
          ],
        ]
      : [
          [
            local && { label: 'Open in editor', icon: FileEditIcon, onSelect: () => void run('open') },
            local && { label: 'Reveal in Finder', icon: Folder01Icon, onSelect: () => void run('reveal') },
            { label: 'Copy link', icon: Link01Icon, onSelect: () => void copyLink() },
            local && { label: 'Copy path', icon: Copy01Icon, onSelect: () => void copyPath() },
          ],
          [
            maintain && {
              label: 'Rename',
              icon: PencilEdit02Icon,
              onSelect: () => {
                setError('');
                setDialog('rename');
              },
            },
            editable && {
              label: system === DEFAULT_SYSTEM ? 'Default system' : 'Set as default',
              icon: StarIcon,
              disabled: system === DEFAULT_SYSTEM,
              onSelect: () => void run('default'),
            },
            editable && { label: 'Archive', icon: Archive02Icon, onSelect: () => void openAction('archive') },
          ],
          [
            editable && {
              label: 'Delete',
              icon: Delete02Icon,
              onSelect: () => void openAction('delete'),
              destructive: true,
            },
          ],
        ],
  );
  if (spec.status === 'archived' && !editable) return null;
  return (
    <div className={variant === 'card' ? 'absolute top-2 right-2' : undefined}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${spec.label}`}
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring ${variant !== 'header' ? 'opacity-0 transition-opacity focus-visible:opacity-100 group-hover/card-wrap:opacity-100 group-focus-within/card-wrap:opacity-100 data-[popup-open]:opacity-100 [@media(hover:none)]:opacity-100' : ''}`}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='min-w-44'>
          {groups.map((group, index) => (
            <Fragment key={index}>
              {index > 0 && <DropdownMenuSeparator />}
              {group.map(action => (
                <DropdownMenuItem
                  key={action.label}
                  disabled={action.disabled}
                  variant={action.destructive ? 'destructive' : undefined}
                  onClick={() => setTimeout(action.onSelect)}
                >
                  <HugeiconsIcon icon={action.icon} />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={dialog !== null}
        onOpenChange={value => {
          if (!value && !busy) setDialog(null);
        }}
      >
        <DialogContent size={dialog === 'restore' ? 'lg' : 'sm'} showCloseButton={!busy}>
          {dialog === 'rename' ? (
            <form
              className='grid gap-4'
              onSubmit={event => {
                event.preventDefault();
                void save(String(new FormData(event.currentTarget).get('name') ?? ''));
              }}
            >
              <DialogHeader>
                <DialogTitle>Rename system</DialogTitle>
                <DialogDescription>Enter the new name.</DialogDescription>
              </DialogHeader>
              <label className='grid gap-1.5 text-sm font-medium'>
                Name
                <Input name='name' defaultValue={spec.label} required maxLength={120} autoFocus />
              </label>
              {error && (
                <p role='alert' className='text-sm text-destructive'>
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type='button' variant='outline' disabled={busy} onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={busy}>
                  {busy ? 'Saving' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          ) : dialog === 'archive' ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {defaultArchive ? `${spec.label} is the default system` : `Archive ${spec.label}?`}
                </DialogTitle>
                <DialogDescription>
                  {defaultArchive
                    ? `Set another system as the default before archiving ${spec.label}.`
                    : 'Files stay in your repository. Archived items are excluded from deployment, and this system becomes unavailable for new prototypes.'}
                </DialogDescription>
              </DialogHeader>
              {!defaultArchive && (
                <>
                  {checking && (
                    <p role='status' className='text-sm text-muted-foreground'>
                      Checking dependencies
                    </p>
                  )}
                  {error && (
                    <p role='alert' className='text-sm text-destructive whitespace-pre-line'>
                      {error}
                    </p>
                  )}
                  {!error && archiveTargets.length > 0 && (
                    <div className='grid gap-2 text-sm'>
                      <p className='font-medium'>
                        Also archives {archiveTargets.length} {archiveTargets.length === 1 ? 'prototype' : 'prototypes'}
                      </p>
                      <ul className='max-h-48 list-disc overflow-auto pl-5'>
                        {archiveTargets.map(proto => (
                          <li key={`${proto.contributorKey}/${proto.id}`}>
                            <Link {...prototypeLink(proto)} className='underline'>
                              {proto.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <DialogFooter>
                <Button variant='outline' disabled={busy} onClick={() => setDialog(null)}>
                  {defaultArchive ? 'Close' : 'Cancel'}
                </Button>
                {!defaultArchive && (
                  <Button disabled={busy || checking || !allowed} onClick={() => void save()}>
                    {busy ? 'Archiving' : 'Archive system'}
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialog === 'restore' ? 'Restore' : 'Delete'} {spec.label}?
                </DialogTitle>
                {dialog === 'restore' ? (
                  <DialogDescription>
                    Make this system available for new prototypes again. Choose whether to restore the prototypes
                    archived with it.
                  </DialogDescription>
                ) : (
                  <DialogDescription render={<div />} className='space-y-3'>
                    <p>This permanently deletes the system’s files. Studio cannot undo this.</p>
                    {dependents.length > 0 && (
                      <p>
                        Associated prototypes keep their files, but won’t work or deploy until rebuilt with another
                        system.
                      </p>
                    )}
                  </DialogDescription>
                )}
              </DialogHeader>
              {checking && (
                <p role='status' className='text-sm text-muted-foreground'>
                  Checking system dependencies
                </p>
              )}
              {error && (
                <p role='alert' className='text-sm text-destructive whitespace-pre-line'>
                  {error}
                </p>
              )}
              {dependents.length > 0 && (
                <div className='grid gap-2 text-sm'>
                  <p>These prototypes depend on {spec.label}.</p>
                  <ul className='max-h-48 list-disc overflow-auto pl-5'>
                    {dependents.map(proto => (
                      <li key={`${proto.contributorKey}/${proto.id}`}>
                        <Link {...prototypeLink(proto)} className='underline'>
                          {proto.title}
                        </Link>
                        {proto.status === 'archived' ? ' (archived)' : ''}
                        {proto.rebuild?.targetSystemKey === system ? ' (pending rebuild)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <DialogFooter>
                {dialog === 'restore' ? (
                  <>
                    <Button
                      variant='outline'
                      disabled={busy || checking || !allowed}
                      onClick={() => void save(undefined, false)}
                    >
                      Restore system only
                    </Button>
                    <Button disabled={busy || checking || !allowed} onClick={() => void save(undefined, true)}>
                      {busy ? 'Restoring' : 'Restore system and prototypes'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant='outline' disabled={busy} onClick={() => setDialog(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant='destructive'
                      disabled={busy || checking || !allowed}
                      onClick={() => void save(undefined, false)}
                    >
                      {busy ? 'Working' : 'Delete system'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
