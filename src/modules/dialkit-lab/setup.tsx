import { readSource, writeSource, type ArtifactContext } from '#studio/data';
import { readWorkspace, scaffoldWorkspace, removeWorkspace } from './scaffold';
import { showControls } from './visibility';

const identityOf = ({ proto, item }: ArtifactContext) => JSON.stringify([proto.studioId, item.studioId]);
const notify = (context: ArtifactContext, open = false) => window.dispatchEvent(new CustomEvent('studio-dialkit-workspace', { detail: { identity: identityOf(context), open } }));
export async function addDialKit(context: ArtifactContext) {
  const { proto, item } = context;
  const source = await readSource(proto, item.path);
  if (!readWorkspace(source.content)) await writeSource(proto, item.path, scaffoldWorkspace(source.content), source.version);
  showControls(identityOf(context));
  notify(context, true);
}
export async function deleteDialKit(context: ArtifactContext) {
  const { proto, item } = context;
  const source = await readSource(proto, item.path);
  // Existing arbitrary hook bindings require source acceptance before instrumentation can be removed.
  if (/\buseBespokeControls\s*\(/.test(source.content)) throw new Error('Save the connected dials into source before removing their bindings.');
  const next = removeWorkspace(source.content);
  if (next !== source.content) await writeSource(proto, item.path, next, source.version);
  notify(context);
}
