import { useMemo, type ReactNode } from 'react';
import SourceEditor from '@/platform/core/source/SourceEditor';
import { canChangePrototype, readSource, repoPath, useMe, writeSource } from '@/platform/app/data/files';
import { artifactAvailability } from '@/platform/core/fileTypes';
import { SYSTEM_CONTENT_KEY } from '@/platform/core/roots';
import { FILE_TYPES } from '@/platform/app/data/fileTypes';
import type { Artifact, Prototype } from '@/platform/app/data/types';

// Adapt prototype and system content file access to the shared platform editor.
export default function ArtifactSource({
  proto,
  item,
  label,
  actions,
  onDirty,
}: {
  proto: Prototype;
  item: Artifact;
  label?: ReactNode;
  actions?: ReactNode;
  onDirty?: (dirty: boolean) => void;
}) {
  const me = useMe();
  const editable = artifactAvailability(FILE_TYPES[item.fileType], {
    local: import.meta.env.DEV,
    editable: canChangePrototype(proto, me),
    present: true,
    renderer: true,
    scope: proto.contributorKey === SYSTEM_CONTENT_KEY ? 'systemContent' : 'prototype',
  }).editSource.available;
  const source = useMemo(
    () => ({
      path: repoPath(proto, item.path),
      editable,
      read: () => readSource(proto, item.path),
      write: (content: string, base: string) => writeSource(proto, item.path, content, base),
    }),
    [proto.contributorKey, proto.id, item.path, editable],
  );
  return (
    <SourceEditor
      source={source}
      language={FILE_TYPES[item.fileType].language ?? 'text'}
      label={label}
      actions={actions}
      onDirty={onDirty}
    />
  );
}
