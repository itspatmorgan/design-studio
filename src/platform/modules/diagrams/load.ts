import type { ArtifactContext } from '@/platform/app/data/fileTypeModule';
import { readSource } from '@/platform/app/data/files';
import { rootOf } from '@/platform/core/roots';
import { diagramFiles } from './loader';

export async function loadDiagram({ proto, item }: ArtifactContext) {
  const source = import.meta.env.DEV
    ? (await readSource(proto, item.path)).content
    : await diagramFiles[`/${rootOf(proto.contributorKey, proto.id)}/${item.path}`]?.();
  return source === undefined ? undefined : { proto, item, source };
}
