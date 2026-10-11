import { Link } from '@tanstack/react-router';
import { Button } from '@/platform/systems/studio/components/button';
import { Checkbox } from '@/platform/systems/studio/components/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/platform/systems/studio/components/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/platform/systems/studio/components/dialog';
import { adminProblems } from '@/platform/core/config';
import { useStudioSettings } from '@/platform/app/settings/useStudioSettings';

const fields = ['admins', 'systemMaintainers'] as const;

export default function Contributors() {
  const {
    snapshot,
    draft,
    error,
    saving,
    restarting,
    conflict,
    dirty,
    blocker,
    editable,
    disabled,
    update,
    save,
    load,
    discard,
  } = useStudioSettings(fields, 'Permissions saved');
  return (
    <main className='mx-auto w-full max-w-3xl shrink-0 space-y-6 px-4 py-8 sm:px-8 sm:py-10'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>Contributors</h1>
        <p className='text-sm text-muted-foreground'>
          See who contributes and assign permission to manage the studio or specific systems.
        </p>
      </header>
      {error && (
        <Alert variant='destructive' className='space-y-3 p-4'>
          <p className='whitespace-pre-line'>{error}</p>
          <Button
            variant='outline'
            onClick={() => {
              if (!dirty || window.confirm('Discard unsaved permissions and reload?')) void load();
            }}
          >
            Reload permissions
          </Button>
        </Alert>
      )}
      {!snapshot || !draft ? (
        !error && (
          <p role='status' className='text-sm text-muted-foreground'>
            Loading settings
          </p>
        )
      ) : (
        <>
          {!editable && (
            <Alert role='note' className='p-4'>
              {snapshot.role
                ? 'You can view permissions. An Admin can change them.'
                : 'Ask your agent to register your contributor identity before editing permissions.'}
            </Alert>
          )}
          <Alert role='note' className='p-4'>
            <AlertTitle>Permissions are shared through Git</AlertTitle>
            <AlertDescription>
              Changes save to your local repository. Share them through your team’s Git workflow.
            </AlertDescription>
          </Alert>
          <form
            className='space-y-6'
            onSubmit={event => {
              event.preventDefault();
              void save();
            }}
          >
            <section aria-label='Contributor assignments'>
              <ul className='divide-y divide-border'>
                {snapshot.contributors.map(person => {
                  const admin = draft.admins?.includes(person.key) ?? false;
                  return (
                    <li
                      key={person.key}
                      className='flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0'
                    >
                      <div>
                        <Link
                          to={'/prototypes' as never}
                          search={{ q: person.key } as never}
                          className='text-sm font-medium hover:underline'
                        >
                          {person.name}
                        </Link>
                        {person.key === snapshot.actor && (
                          <span className='ml-2 text-xs text-muted-foreground'>You</span>
                        )}
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {person.key}
                          {person.github && ` · @${person.github}`}
                        </p>
                      </div>
                      <div className='flex flex-wrap items-center gap-3'>
                        {
                          <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                              checked={admin}
                              disabled={disabled}
                              onCheckedChange={checked =>
                                update({
                                  admins: checked
                                    ? [...(draft.admins ?? []), person.key]
                                    : (draft.admins ?? []).filter(key => key !== person.key),
                                })
                              }
                            />
                            Admin
                          </label>
                        }
                        {admin ? (
                          <span className='text-sm text-muted-foreground'>Full studio access</span>
                        ) : (
                          snapshot.systems
                            .filter(
                              system => system.status === 'active' && Object.hasOwn(draft.systemMaintainers, system.id),
                            )
                            .map(system => (
                              <label key={system.id} className='flex items-center gap-2 text-sm'>
                                <Checkbox
                                  disabled={disabled}
                                  checked={draft.systemMaintainers[system.id].includes(person.key)}
                                  onCheckedChange={checked =>
                                    update({
                                      systemMaintainers: {
                                        ...draft.systemMaintainers,
                                        [system.id]: checked
                                          ? [...draft.systemMaintainers[system.id], person.key]
                                          : draft.systemMaintainers[system.id].filter(key => key !== person.key),
                                      },
                                    })
                                  }
                                />
                                {system.label} system
                              </label>
                            ))
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className='mt-6 border-t border-border pt-5'>
                <h2 className='text-sm font-medium'>Access levels</h2>
                <dl className='mt-3 space-y-3 text-sm'>
                  <div>
                    <dt className='font-medium'>Contributor</dt>
                    <dd className='mt-1 text-muted-foreground'>
                      Manages their own prototypes. Can use any active prototype system.
                    </dd>
                  </div>
                  <div>
                    <dt className='font-medium'>System maintainer</dt>
                    <dd className='mt-1 text-muted-foreground'>
                      Contributor access, plus editing the components, styles, assets, context, and skills in each
                      assigned active system.
                    </dd>
                  </div>
                  <div>
                    <dt className='font-medium'>Admin</dt>
                    <dd className='mt-1 text-muted-foreground'>
                      Manages the whole studio, all systems and prototypes, and contributor permissions.
                    </dd>
                  </div>
                </dl>
                <p className='mt-4 text-sm text-muted-foreground'>
                  Repository access is managed separately through your Git provider.
                </p>
              </div>
            </section>

            {editable && (
              <div className='space-y-3'>
                {adminProblems(
                  draft,
                  snapshot.contributors.map(person => person.key),
                ).length > 0 && (
                  <p role='alert' className='text-sm text-destructive'>
                    Team use requires at least one registered Admin.
                  </p>
                )}
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <p role='status' className='text-sm text-muted-foreground'>
                    {restarting
                      ? 'Restarting the studio'
                      : dirty
                        ? 'Unsaved changes. Saving restarts the studio.'
                        : 'Permissions are up to date.'}
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={!dirty || disabled}
                      onClick={() => {
                        discard();
                      }}
                    >
                      Discard
                    </Button>
                    <Button
                      type='submit'
                      disabled={
                        !dirty ||
                        disabled ||
                        conflict ||
                        !draft.name.trim() ||
                        adminProblems(
                          draft,
                          snapshot.contributors.map(person => person.key),
                        ).length > 0
                      }
                    >
                      {saving ? 'Saving' : 'Save changes'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </>
      )}
      <Dialog
        open={blocker.status === 'blocked'}
        onOpenChange={open => {
          if (!open && blocker.status === 'blocked') blocker.reset();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard your changes?</DialogTitle>
            <DialogDescription>You have unsaved permissions. They’ll be lost if you leave.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => blocker.reset?.()}>
              Keep editing
            </Button>
            <Button onClick={() => blocker.proceed?.()}>Discard and leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
