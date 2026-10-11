// A component's files in the Source editor, one tab each: its page (Markdown), its examples, and
// the component itself. Shown in place of the component's page through navigation's Edit source action; the page updates as you save. A file the component doesn't have yet is offered as
// a template. Dev only: it reads and saves through the file layer (src/platform/node/build/vite-files-plugin.js).
import { useMemo, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import SourceEditor from '@/platform/core/source/SourceEditor';
import type { SourceAccess } from '@/platform/core/source/access';
import { sourceOf } from '../sources';
import { PLATFORM_ID, PLATFORM_SOURCE } from '../data/systems';
import { PROTOTYPE_SYSTEMS } from '../data/systems';
import { systemSourceRequest } from './systemSource';
import { shortcutLabel } from '@/platform/app/shell/artifactShortcuts';
import { canEditSource, useMe, fileOp, systemFiles } from '@/platform/app/data/files';
import { setManifest } from '@/platform/app/data/manifest';
import { Button } from '@/platform/systems/studio/components/button';
import { toast } from '@/platform/systems/studio/components/toast';
import { Tabs, TabsList, TabsTrigger } from '@/platform/systems/studio/components/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/platform/systems/studio/components/dialog';
import type { SystemComponentDoc } from '@/modules/systems/docs';

type Kind = keyof SystemComponentDoc['files'];

// What each tab holds, in order, and how the editor opens its file (Markdown as a document; the rest as text).
const TABS: { kind: Kind; label: string; missing: string }[] = [
  { kind: 'doc', label: 'Page', missing: 'This component has no page yet.' },
  { kind: 'examples', label: 'Examples', missing: 'This component has no examples yet.' },
  { kind: 'source', label: 'Component', missing: 'This component has no file yet.' },
];

const headerClass = 'flex h-[57px] shrink-0 items-center gap-3 border-b border-border px-4 text-[12px]';

export function ComponentEditor({
  system,
  component,
  onDone,
}: {
  system: string;
  component: SystemComponentDoc;
  onDone: () => void;
}) {
  const me = useMe();
  const router = useRouter();
  const proto = systemFiles(system);
  const tabs = TABS.filter(t => t.kind !== 'source' || component.files.source);
  const [kind, setKind] = useState<Kind>(() => tabs.find(tab => component.files[tab.kind])?.kind ?? 'doc');
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState(false);
  // What the person asked to do while there are unsaved edits, until they decide.
  const [pending, setPending] = useState<(() => void) | null>(null);
  const ifSaved = (action: () => void) => (dirty ? setPending(() => action) : action());

  const tab = tabs.find(t => t.kind === kind) ?? tabs[0];
  const path = component.files[tab.kind];
  const spec = system === PLATFORM_ID ? PLATFORM_SOURCE : sourceOf(system, PROTOTYPE_SYSTEMS[system]);
  const fullPath = path ? spec.components + '/' + path : null;
  const editable = canEditSource(fullPath ?? spec.components, me);
  const access = useMemo<SourceAccess | null>(
    () =>
      fullPath
        ? {
            path: fullPath,
            editable,
            read: () => systemSourceRequest('read', fullPath),
            write: (content, base) => systemSourceRequest('write', fullPath, { content, base }),
          }
        : null,
    [fullPath, editable],
  );

  const switcher = (
    <Tabs value={tab.kind} onValueChange={next => ifSaved(() => setKind(next as Kind))}>
      <TabsList>
        {tabs.map(t => (
          <TabsTrigger key={t.kind} value={t.kind}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
  const done = (
    <Button size='sm' variant='outline' onClick={onDone} title={`Return to rendered view (${shortcutLabel('source')})`}>
      Done
    </Button>
  );

  // Adds whichever of the examples and page are missing, from the templates (like pnpm component-docs).
  async function addFiles() {
    setAdding(true);
    try {
      const result = await fileOp(proto, { op: 'add-docs', component: component.slug });
      setManifest(result.manifest);
      await router.invalidate();
    } catch (e) {
      toast.add({ type: 'error', title: (e as Error).message });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {path && access ? (
        <SourceEditor
          key={fullPath}
          source={access}
          language={tab.kind === 'doc' ? 'markdown' : 'text'}
          label={switcher}
          actions={done}
          onDirty={setDirty}
        />
      ) : (
        <>
          <div className={headerClass}>
            {switcher}
            <span className='ml-auto' />
            {done}
          </div>
          <div className='grid flex-1 place-items-center p-8'>
            <div className='max-w-sm text-center'>
              <p className='text-sm font-medium text-foreground'>{tab.missing}</p>
              <p className='mt-1 mb-4 text-sm text-muted-foreground'>
                Create the files this component is missing, from a template.
              </p>
              <Button onClick={addFiles} disabled={adding || !editable}>
                {adding ? 'Creating' : 'Create files'}
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={pending !== null}
        onOpenChange={o => {
          if (!o) setPending(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard your changes?</DialogTitle>
            <DialogDescription>You have unsaved changes to {path}. They'll be lost if you leave.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setPending(null)}>
              Keep editing
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                const action = pending;
                setPending(null);
                setDirty(false);
                action?.();
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
