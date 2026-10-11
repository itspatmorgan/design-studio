import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { SourceChanged, type SourceAccess } from './access';
import { Button } from '@/platform/systems/studio/components/button';
import { toast } from '@/platform/systems/studio/components/toast';
import { shortcutLabel } from '@/platform/app/shell/artifactShortcuts';
import { sourceTheme } from '@/platform/core/source/sourceTheme';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/platform/systems/studio/components/dialog';

// The file type's syntax, loaded when it's needed.
async function languageExtension(
  language: 'tsx' | 'markdown' | 'json' | 'mermaid' | 'text',
  path: string,
): Promise<Extension> {
  // A text file's syntax comes from its extension; one we don't have is shown plainly.
  if (language === 'text') {
    const ext = path.split('.').at(-1)?.toLowerCase() ?? '';
    if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'json'].includes(ext)) language = ext === 'json' ? 'json' : 'tsx';
    else if (ext === 'mermaid' || ext === 'mmd') language = 'mermaid';
    else if (ext === 'md') language = 'markdown';
    else if (ext === 'css') return (await import('@codemirror/lang-css')).css();
    else return [];
  }
  if (language === 'mermaid') return (await import('@/platform/core/source/mermaidSource')).mermaidSource();
  if (language === 'markdown') return (await import('@/platform/core/source/markdownSource')).markdownSource();
  const { javascript } = await import('@codemirror/lang-javascript');
  return language === 'json' ? javascript() : javascript({ jsx: true, typescript: true });
}

type Disk = { content: string; version: string };
export type SourceLanguage = 'tsx' | 'markdown' | 'json' | 'mermaid' | 'text';
type SourceEditorProps = {
  source: SourceAccess;
  language: SourceLanguage;
  label?: ReactNode;
  actions?: ReactNode;
  onDirty?: (dirty: boolean) => void;
};

export default function SourceEditor({ label, actions, onDirty, source, language: syntax }: SourceEditorProps) {
  const editable = import.meta.env.DEV && source.editable;
  const { read, write, path } = source;
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // What's on disk as far as this pane knows: the text and version it last read or saved.
  const disk = useRef<Disk | null>(null);
  const dirty = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The file changed on disk while there were unsaved edits.
  const [conflict, setConflict] = useState<Disk | null>(null);
  const save = useRef<() => void>(() => {});
  const savingNow = useRef(false);
  const refreshVersion = useRef(0);
  const refreshSource = useRef<() => void>(() => {});

  useEffect(() => {
    onDirty?.(isDirty);
  }, [isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving with unsaved edits (another item, Preview, a reload) asks first.
  const blocker = useBlocker({
    shouldBlockFn: () => dirty.current,
    enableBeforeUnload: () => dirty.current,
    withResolver: true,
  });

  // Replace the editor's text with the disk's, as a change the editor treats as clean.
  const takeDisk = (next: Disk) => {
    const v = view.current;
    if (!v) return;
    disk.current = next;
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: next.content } });
    dirty.current = false;
    setIsDirty(false);
    setConflict(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await Promise.all([read(), languageExtension(syntax, path)]).catch((e: Error) => {
        if (!cancelled) setError(e.message);
        return null;
      });
      if (cancelled || !loaded || !host.current) return;
      const [first, language] = loaded;
      disk.current = first;
      view.current = new EditorView({
        parent: host.current,
        state: EditorState.create({
          doc: first.content,
          extensions: [
            lineNumbers(),
            highlightActiveLine(),
            highlightActiveLineGutter(),
            drawSelection(),
            history(),
            bracketMatching(),
            closeBrackets(),
            indentOnInput(),
            foldGutter(),
            highlightSelectionMatches(),
            search({ top: true }),
            sourceTheme,
            language,
            ...(syntax === 'markdown' ? [EditorView.lineWrapping] : []),
            EditorState.readOnly.of(!editable),
            EditorView.editable.of(editable),
            // Named for screen readers. A read-only editor isn't focusable by default, which would leave
            // it without ⌘F, go to line, and keyboard selection, so it gets a tab stop.
            EditorView.contentAttributes.of({
              'aria-label': `Source of ${path}`,
              ...(editable ? {} : { tabindex: '0' }),
            }),
            keymap.of([
              {
                key: 'Mod-s',
                preventDefault: true,
                run: () => {
                  save.current();
                  return true;
                },
              },
              ...closeBracketsKeymap,
              ...defaultKeymap,
              ...historyKeymap,
              ...foldKeymap,
              ...searchKeymap,
            ]),
            EditorView.updateListener.of(update => {
              if (!update.docChanged) return;
              const now = update.state.doc.toString() !== disk.current?.content;
              if (now !== dirty.current) {
                dirty.current = now;
                setIsDirty(now);
              }
            }),
          ],
        }),
      });
      view.current.focus();
    })();
    return () => {
      cancelled = true;
      view.current?.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, syntax, editable, source]);

  // The file changed on disk. Our own saves come back here too, and are recognized by version.
  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) return;
    let active = true;
    const refresh = async () => {
      if (savingNow.current) return; // The save acknowledgement is followed by a fresh read.
      const ticket = ++refreshVersion.current;
      const next = await read().catch(() => null);
      if (
        !active ||
        ticket !== refreshVersion.current ||
        !next ||
        !disk.current ||
        next.version === disk.current.version
      )
        return;
      if (dirty.current) setConflict(next);
      else takeDisk(next);
    };
    refreshSource.current = () => {
      void refresh();
    };
    const onSource = (change: { path: string }) => {
      if (change.path === path) void refresh();
    };
    hot.on('studio:source', onSource);
    return () => {
      active = false;
      ++refreshVersion.current;
      refreshSource.current = () => {};
      hot.off?.('studio:source', onSource);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, source]);

  save.current = async () => {
    const v = view.current;
    if (!v || !editable || !dirty.current || !disk.current || savingNow.current) return;
    const content = v.state.doc.toString();
    savingNow.current = true;
    ++refreshVersion.current; // Older reads cannot overwrite the save acknowledgement.
    setSaving(true);
    setError(null);
    try {
      const { version, warnings } = await write(content, disk.current.version);
      if (view.current !== v) return;
      disk.current = { content, version };
      setConflict(null);
      dirty.current = v.state.doc.toString() !== content;
      setIsDirty(dirty.current);
      toast.add({ title: 'Saved', timeout: 2000 });
      // Saved anyway, but a skill out of the format would fail the build: say so now.
      for (const warning of warnings ?? []) toast.add({ type: 'error', title: warning });
    } catch (e) {
      if (view.current !== v) return;
      if (!(e instanceof SourceChanged)) toast.add({ type: 'error', title: (e as Error).message });
    } finally {
      savingNow.current = false;
      setSaving(false);
      refreshSource.current(); // The pane may have changed while this write completed.
    }
  };

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground'>
      {/* 56px of content plus the 1px border puts the text and Save at the same height as the
          navigation's title row and its buttons */}
      <div className='flex h-[57px] shrink-0 items-center gap-3 border-b border-border px-4 text-[12px]'>
        {label ?? (
          <span className='min-w-0 truncate font-mono text-muted-foreground' title={path}>
            {path}
          </span>
        )}
        <span className='ml-auto shrink-0 text-muted-foreground'>
          {!editable ? 'Read-only' : isDirty ? 'Unsaved changes' : ''}
        </span>
        {/* Save and the buttons after it sit closer together than the header's other items. */}
        <div className='flex shrink-0 items-center gap-1.5'>
          {editable && (
            <Button
              size='sm'
              disabled={!isDirty || saving}
              onClick={() => save.current()}
              title={`Save (${shortcutLabel('save')})`}
            >
              {saving ? 'Saving' : 'Save'}
            </Button>
          )}
          {actions}
        </div>
      </div>
      {conflict && (
        <div
          role='alert'
          className='flex shrink-0 items-center gap-3 border-b border-border bg-muted px-4 py-2 text-[12px]'
        >
          <span className='min-w-0 flex-1'>This file changed on disk while you were editing it.</span>
          <Button size='sm' variant='outline' onClick={() => takeDisk(conflict)}>
            Load the new version
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              disk.current = conflict;
              setConflict(null);
            }}
          >
            Keep mine
          </Button>
        </div>
      )}
      {error && (
        <p role='alert' className='shrink-0 border-b border-border px-4 py-2 text-[12px] text-destructive'>
          {error}
        </p>
      )}
      <div ref={host} className='min-h-0 flex-1 overflow-hidden' />

      <Dialog
        open={blocker.status === 'blocked'}
        onOpenChange={o => {
          if (!o) blocker.reset?.();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard your changes?</DialogTitle>
            <DialogDescription>You have unsaved changes to {path}. They'll be lost if you leave.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => blocker.reset?.()}>
              Keep editing
            </Button>
            <Button variant='destructive' onClick={() => blocker.proceed?.()}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
