import { artifactAvailability } from '@/platform/core/fileTypes';
import { Suspense } from 'react';
import { lazyRouteComponent, useRouter } from '@tanstack/react-router';
import { Button } from '@/platform/systems/studio/components/button';
import { findArtifact } from '@/platform/app/data/manifest';
import { FILE_TYPES, fileTypeModules } from '@/platform/app/data/fileTypes';
import { useSourceView } from '@/platform/core/source/useSourceView';
import { NotFound } from '@/platform/app/shell/App';
import type { Prototype } from '@/platform/app/data/types';
import { prepareFile } from '@/platform/app/data/fileTypeModule';
import type { FileTypeModule } from '@/platform/app/data/fileTypeModule';
import { contentSection, rootOf } from '@/platform/core/roots';
import { skillFolder } from './skillBundle';
const Source = import.meta.env.DEV ? lazyRouteComponent(() => import('@/platform/app/source/ArtifactSource')) : null;
const SkillSource = import.meta.env.DEV ? lazyRouteComponent(() => import('./SkillSource')) : null;
const explanations: Record<string, string> = {
  Context: 'Knowledge, principles, and standing requirements shared by people and agents.',
  Skills:
    'Procedures for tasks owned by this platform, module, or system. Each skill describes when to use it and how to perform the task.',
};
export type ContentData = {
  type?: FileTypeModule;
  props?: object;
  editing: boolean;
  filePath?: string;
  error?: string;
};
export async function prepareContent(proto: Prototype, slug?: string, mode?: 'source'): Promise<ContentData> {
  const item = slug ? findArtifact(proto, slug) : undefined;
  const editing =
    mode === 'source' &&
    artifactAvailability(item && FILE_TYPES[item.fileType], {
      local: import.meta.env.DEV,
      editable: false,
      present: Boolean(item),
      renderer: Boolean(item && fileTypeModules[item.fileType]),
      scope: 'systemContent',
    }).source.available;
  if (!item) return { editing: false };
  const filePath = '/' + rootOf(proto.contributorKey, proto.id) + '/' + item.path;
  if (editing) {
    await (contentSection(proto.id) === 'skills' && skillFolder(item.path)
      ? SkillSource?.preload?.()
      : Source?.preload?.());
    return { editing, filePath };
  }
  const type = fileTypeModules[item.fileType];
  try {
    const state = artifactAvailability(FILE_TYPES[item.fileType], {
      local: import.meta.env.DEV,
      editable: false,
      present: true,
      renderer: Boolean(type),
      scope: 'systemContent',
    });
    if (!state.view.available) throw new Error(state.view.reason);
    const props = type && (await prepareFile(type, { proto, item }));
    if (!props) throw new Error('This file could not load.');
    return { type, props, editing, filePath };
  } catch (error) {
    return { editing, filePath, error: error instanceof Error ? error.message : String(error) };
  }
}
export default function SystemContentPage({
  proto,
  slug,
  data,
}: {
  proto: Prototype;
  slug?: string;
  data?: ContentData;
}) {
  const router = useRouter();
  const item = slug ? findArtifact(proto, slug) : undefined;
  const editing = Boolean(data?.editing);
  const { toggle, rendered } = useSourceView(
    artifactAvailability(item && FILE_TYPES[item.fileType], {
      local: import.meta.env.DEV,
      editable: false,
      present: Boolean(item),
      renderer: Boolean(item && fileTypeModules[item.fileType]),
      scope: 'systemContent',
    }).source.available,
    editing,
  );
  if (slug && !item) return <NotFound />;
  if (!item)
    return (
      <div className='mx-auto w-full max-w-3xl px-8 py-10'>
        <h1 className='text-3xl font-semibold'>{proto.title}</h1>
        <p className='mt-4 text-muted-foreground'>{explanations[proto.title]}</p>
        <p className='mt-4 text-sm'>
          {proto.artifacts.length
            ? 'Select a file in navigation to read or edit it.'
            : 'No files yet. Ask your agent to add useful material.'}
        </p>
        <p className='mt-4 text-sm text-muted-foreground'>
          Agent instructions must point to the relevant files. Being listed here does not automatically load them into a
          conversation.
        </p>
      </div>
    );
  if (data?.error)
    return (
      <div role='alert' className='space-y-3 p-8'>
        <p className='text-sm'>{data.error}</p>
        <Button
          variant='outline'
          onClick={() => {
            void router.invalidate();
          }}
        >
          Try again
        </Button>
      </div>
    );
  if (editing)
    return (
      <Suspense fallback={null}>
        {contentSection(proto.id) === 'skills' && skillFolder(item.path) && SkillSource ? (
          <SkillSource proto={proto} item={item} onDone={toggle} />
        ) : (
          Source && (
            <Source
              proto={proto}
              item={item}
              actions={
                <Button size='sm' variant='outline' onClick={toggle}>
                  Done
                </Button>
              }
            />
          )
        )}
      </Suspense>
    );
  return (
    <div ref={rendered} tabIndex={-1} className='flex min-h-0 flex-1 flex-col outline-none'>
      {data?.type && data.props ? (
        <Suspense fallback={null}>
          <data.type.Page {...data.props} />
        </Suspense>
      ) : (
        <p className='p-8 text-sm'>Loading…</p>
      )}
    </div>
  );
}
