// One document, in the app's own style (not its prototype's design system), inside an error
// boundary: a document that fails to render shows the error, with a button to copy it.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  compiledLifecycle,
  freshness,
  lifecycleAttributes,
  initialLifecycle,
  type ArtifactFile,
} from '@/platform/core/artifact-lifecycle/index';
import type { MDXContent } from 'mdx/types';
import { ErrorBoundary } from 'react-error-boundary';
import { DocBase } from '@/platform/app/docs/DocBase';
import { DocLayout } from '@/platform/app/docs/DocLayout';
import type { DocFrontmatter } from '@/platform/app/docs/types';
import ViewError from '@/platform/modules/prototypes/viewer/ViewError';

// docKey (contributor/prototype/path) resets the error boundary when the document changes,
// and so does a new Component (the file was fixed, in dev).
function Committed({ ready }: { ready: () => void }) {
  useEffect(ready, [ready]);
  return null;
}

export default function MarkdownPage({
  Component,
  frontmatter,
  docKey,
  base,
  footer,
  file,
}: {
  Component: MDXContent;
  frontmatter: DocFrontmatter;
  docKey: string;
  base: string;
  footer?: ReactNode;
  file?: ArtifactFile;
}) {
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const changed = () => setRefresh(value => value + 1);
    import.meta.hot?.on('vite:afterUpdate', changed);
    return () => import.meta.hot?.off('vite:afterUpdate', changed);
  }, []);
  const [lifecycle, setLifecycle] = useState(initialLifecycle);
  const controller = useRef<ReturnType<typeof compiledLifecycle> | null>(null);
  const evidence = useMemo(() => ({ committed: false, error: null as string | null }), [Component, docKey]);
  const ready = useCallback(() => {
    evidence.committed = true;
    controller.current?.ready();
  }, [evidence, refresh]);
  const failed = (error: unknown) => {
    evidence.error = error instanceof Error ? error.message : String(error);
    controller.current?.failed(evidence.error, false);
  };
  const fileKey = file ? JSON.stringify(file) : '';
  useEffect(() => {
    if (!file) return;
    const next = compiledLifecycle(file, setLifecycle);
    controller.current = next;
    next.begin();
    if (evidence.error) next.failed(evidence.error, false);
    else if (evidence.committed) next.ready();
    return () => {
      controller.current = null;
      next.dispose();
    };
    // Component updates retain the controller; the commit marker supplies fresh evidence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);
  return (
    <div
      {...(file ? lifecycleAttributes(lifecycle) : {})}
      data-artifact-identity={file ? docKey : undefined}
      className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
    >
      <ErrorBoundary resetKeys={[docKey, Component]} FallbackComponent={ViewError} onError={failed}>
        {/* data-doc-scroll: where DocLayout scrolls to the top or to a heading. `relative` keeps the
            hidden heading Markdown footnotes add (position: absolute) inside this box; otherwise it
            sits against the page, which then scrolls when you follow a footnote link. */}
        <div data-doc-scroll className='relative min-h-0 flex-1 overflow-y-auto bg-background text-foreground'>
          <DocBase.Provider value={base}>
            <DocLayout
              Component={Component}
              title={frontmatter.title}
              description={frontmatter.description}
              toc={frontmatter.toc}
              scrollKey={docKey}
              footer={footer}
            />
          </DocBase.Provider>
          <Committed ready={ready} />
        </div>
      </ErrorBoundary>
      {file && (freshness(lifecycle) === 'stale' || lifecycle.detail) && (
        <p role='status' className='absolute inset-x-0 bottom-0 bg-background p-3 text-sm'>
          {freshness(lifecycle) === 'stale' ? 'This document is out of date. ' : ''}
          {lifecycle.phase === 'error'
            ? 'The latest changes could not render. Give the error to your agent.'
            : lifecycle.detail || 'Updating document…'}
        </p>
      )}
    </div>
  );
}
