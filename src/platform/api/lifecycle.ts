// #studio/lifecycle: renderer-neutral revision and commit semantics.
/** Creates the shared source/preparation/displayed revision controller. */
export { createArtifactLifecycle } from '../core/artifact-lifecycle/state.ts';
/** Initial lifecycle state before revision evidence is available. */
export { initialLifecycle } from '../core/artifact-lifecycle/state.ts';
/** Compares source and rendering-input revisions. */
export { sameRevision } from '../core/artifact-lifecycle/state.ts';
/** Reports whether displayed output matches the observed inputs. */
export { freshness } from '../core/artifact-lifecycle/state.ts';
/** Validates lifecycle messages at renderer boundaries. */
export { validLifecycle } from '../core/artifact-lifecycle/state.ts';
/** Exposes consistent DOM evidence for rendered artifacts. */
export { lifecycleAttributes } from '../core/artifact-lifecycle/state.ts';
/** A renderer's observed, preparing and displayed state. */
export type { ArtifactLifecycle } from '../core/artifact-lifecycle/state.ts';
/** Source and relevant input digests, independent of permanent identity. */
export type { SourceRevision } from '../core/artifact-lifecycle/state.ts';
/** A ticket invalidated by newer observations, disposal or preparation. */
export type { Preparation } from '../core/artifact-lifecycle/state.ts';
/** Explicit provider activity; rendering does not infer agent activity. */
export type { AgentActivity } from '../core/artifact-lifecycle/state.ts';
/** Digests source text for renderer-owned input evidence. */
export { digestText } from '../core/artifact-lifecycle/inputs.ts';
/** Digests an explicitly collected rendering-input inventory. */
export { digestInputs } from '../core/artifact-lifecycle/inputs.ts';
