import { Suspense } from 'react';
import { getRouteApi, lazyRouteComponent } from '@tanstack/react-router';
import { DocLayout } from '@/platform/app/docs/DocLayout';
import { DocBase } from '@/platform/app/docs/DocBase';
import type { ManualModule } from './loadManual';
import { useSourceView } from '@/platform/core/source/useSourceView';

const DocumentationEditor = import.meta.env.DEV
  ? lazyRouteComponent(() => import('@/platform/app/docs/DocumentationEditor'))
  : null;

export const prepareManualSource = () => DocumentationEditor?.preload?.();

const rootApi = getRouteApi('__root__');

type Props = {
  slug: string;
  Component?: ManualModule['default'];
  source?: { path: string };
  title?: string;
  description?: string;
  toc?: boolean;
};

export default function ManualPage({ slug, source, ...props }: Props) {
  const { manual } = rootApi.useLoaderData();
  const file = manual.find(page => page.slug === slug)?.source ?? `/modules/documentation/pages/${slug}.md`;
  const { rendered } = useSourceView(import.meta.env.DEV, Boolean(source));
  if (source && DocumentationEditor)
    return (
      <Suspense fallback={<p className='p-4 text-sm text-muted-foreground'>Opening source…</p>}>
        <DocumentationEditor path={source.path} />
      </Suspense>
    );
  if (!props.Component) return null;
  return (
    <div ref={rendered} tabIndex={-1} className='flex min-h-0 flex-1 flex-col outline-none'>
      <DocBase.Provider value={file.slice(0, file.lastIndexOf('/'))}>
        <DocLayout {...props} Component={props.Component} scrollKey={slug} />
      </DocBase.Provider>
    </div>
  );
}
