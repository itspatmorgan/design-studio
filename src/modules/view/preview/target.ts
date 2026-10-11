import type { ArtifactContext } from '@/platform/app/data/fileTypeModule';
import { artifactSlug } from '@/platform/core/fileTypes';
import { addressOf } from '@/platform/core/roots';
import { allPrototypes, loadManifest, withItems, findArtifactByIdentity } from '@/platform/app/data/manifest';
import type { Target } from './protocol';

export function previewTarget({ proto, item }: ArtifactContext): Target {
  return {
    contributor: proto.contributorKey,
    prototype: proto.id,
    prototypeId: proto.studioId ?? null,
    artifact: item.path,
    artifactId: item.studioId ?? null,
  };
}
export function artifactHref({ proto, item }: ArtifactContext) {
  return proto.studioId && item.studioId
    ? '/prototypes/' + proto.studioId + '/artifacts/' + item.studioId
    : addressOf(proto.contributorKey, proto.id) + '/' + artifactSlug(item.path);
}
export function loadPreview(context: ArtifactContext) {
  return { target: previewTarget(context), href: artifactHref(context), title: context.proto.title };
}
export async function resolveTarget(target: Target): Promise<ArtifactContext> {
  const refs = allPrototypes(await loadManifest()).filter(proto =>
    target.prototypeId
      ? proto.studioId === target.prototypeId
      : proto.contributorKey === target.contributor && proto.id === target.prototype,
  );
  if (refs.length !== 1) throw new Error('This prototype is unavailable.');
  const proto = await withItems(refs[0]);
  const item = target.artifactId
    ? findArtifactByIdentity(proto, target.artifactId)
    : proto.artifacts.find(item => item.path === target.artifact);
  if (!item || item.fileType !== 'view') throw new Error('This React view is unavailable.');
  return { proto, item };
}
