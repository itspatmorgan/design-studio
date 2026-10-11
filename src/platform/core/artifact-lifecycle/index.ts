// Supported lifecycle entrypoint for artifact modules. Renderers supply evidence and own their recovery policy.
export {
  createArtifactLifecycle,
  initialLifecycle,
  sameRevision,
  freshness,
  validLifecycle,
  lifecycleAttributes,
} from './state.ts';
export type { ArtifactLifecycle, SourceRevision, AgentActivity, Preparation } from './state.ts';
export { readRevision, compiledInputs, applied, digestInputs, digestText } from './inputs.ts';
export type { RevisionSnapshot } from './inputs.ts';
export { compiledLifecycle } from './compiled.ts';
export type { ArtifactFile } from './compiled.ts';
