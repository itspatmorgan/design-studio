import type { ArtifactAction, ArtifactActionContext } from './fileTypeModule';
// Kept independent of the application registry so public FileTree consumers stay cycle-free.
let providers: Array<(context: ArtifactActionContext) => readonly ArtifactAction[]> = [];
export function registerArtifactContributions(next: typeof providers) {
  providers = next;
}
export function contributedArtifactActions(context: ArtifactActionContext) {
  return providers.flatMap(provider => provider(context));
}
