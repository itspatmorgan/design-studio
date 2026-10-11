// Shared lifecycle semantics. Module renderers supply revision evidence; this does not infer agent activity.
export type SourceRevision = { source: string; inputs: string };
export type AgentActivity = { provider: string; state: 'idle' | 'working' } | null;
export type ArtifactLifecycle = {
  version: 1;
  generation: number;
  attempt: number;
  source: SourceRevision | null;
  preparing: SourceRevision | null;
  displayed: { revision: SourceRevision; commit: number } | null;
  phase: 'unknown' | 'preparing' | 'ready' | 'error' | 'paused' | 'disposed';
  detail: string;
  activity: AgentActivity;
};
export type Preparation = { generation: number; attempt: number; revision: SourceRevision };
export const sameRevision = (a: SourceRevision | null, b: SourceRevision | null) =>
  Boolean(a && b && a.source === b.source && a.inputs === b.inputs);
export const freshness = (state: ArtifactLifecycle): 'current' | 'stale' | 'unknown' | 'empty' => {
  if (!state.displayed) return 'empty';
  if (!state.source) return 'unknown';
  return sameRevision(state.source, state.displayed.revision) ? 'current' : 'stale';
};
export function initialLifecycle(): ArtifactLifecycle {
  return {
    version: 1,
    generation: 0,
    attempt: 0,
    source: null,
    preparing: null,
    displayed: null,
    phase: 'unknown',
    detail: '',
    activity: null,
  };
}
export function createArtifactLifecycle(publish: (state: ArtifactLifecycle) => void = () => {}) {
  let state = initialLifecycle();
  let commits = 0;
  const update = (next: ArtifactLifecycle) => {
    state = next;
    publish(state);
  };
  const accepts = (ticket: Preparation) =>
    state.phase === 'preparing' &&
    ticket.generation === state.generation &&
    ticket.attempt === state.attempt &&
    sameRevision(ticket.revision, state.source);
  return {
    get state() {
      return state;
    },
    observe(revision: SourceRevision) {
      if (state.phase === 'disposed' || sameRevision(state.source, revision)) return;
      update({
        ...state,
        source: revision,
        preparing: null,
        generation: state.generation + 1,
        phase: state.phase === 'paused' ? 'paused' : 'preparing',
        detail: '',
      });
    },
    prepare(revision: SourceRevision): Preparation | null {
      if (state.phase === 'paused' || state.phase === 'disposed') return null;
      this.observe(revision);
      const ticket = { generation: state.generation, attempt: state.attempt + 1, revision };
      update({ ...state, attempt: ticket.attempt, preparing: revision, phase: 'preparing', detail: '' });
      return ticket;
    },
    commit(ticket: Preparation) {
      if (!accepts(ticket)) return false;
      update({
        ...state,
        preparing: null,
        displayed: { revision: ticket.revision, commit: ++commits },
        phase: 'ready',
        detail: '',
      });
      return true;
    },
    fail(ticket: Preparation, detail: string, retained: boolean) {
      if (!accepts(ticket)) return false;
      update({
        ...state,
        preparing: null,
        displayed: retained ? state.displayed : null,
        phase: 'error',
        detail: detail.slice(0, 4096),
      });
      return true;
    },
    error(detail: string, retained: boolean) {
      if (state.phase === 'disposed' || state.phase === 'paused') return;
      update({
        ...state,
        generation: state.generation + 1,
        preparing: null,
        displayed: retained ? state.displayed : null,
        phase: 'error',
        detail: detail.slice(0, 4096),
      });
    },
    unknown(detail = '') {
      if (state.phase === 'disposed') return;
      update({
        ...state,
        source: null,
        preparing: null,
        generation: state.generation + 1,
        phase: state.phase === 'paused' ? 'paused' : 'unknown',
        detail: detail.slice(0, 4096),
      });
    },
    pause() {
      if (state.phase !== 'disposed')
        update({ ...state, generation: state.generation + 1, preparing: null, phase: 'paused' });
    },
    resume() {
      if (state.phase === 'paused') update({ ...state, phase: state.source ? 'preparing' : 'unknown' });
    },
    activity(provider: string, value: 'idle' | 'working' | null) {
      if (state.phase === 'disposed') return;
      if (!provider || provider.length > 128 || (value !== null && value !== 'idle' && value !== 'working'))
        throw new Error('Invalid activity provider.');
      update({ ...state, activity: value === null ? null : { provider, state: value } });
    },
    dispose() {
      update({ ...initialLifecycle(), generation: state.generation + 1, phase: 'disposed' });
    },
  };
}
export function validLifecycle(value: unknown): value is ArtifactLifecycle {
  const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
  const counter = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;
  const revision = (v: unknown) =>
    record(v) &&
    typeof v.source === 'string' &&
    /^[a-f0-9]{64}$/.test(v.source) &&
    typeof v.inputs === 'string' &&
    /^[a-f0-9]{64}$/.test(v.inputs);
  if (
    !record(value) ||
    value.version !== 1 ||
    !counter(value.generation) ||
    !counter(value.attempt) ||
    typeof value.phase !== 'string' ||
    !['unknown', 'preparing', 'ready', 'error', 'paused', 'disposed'].includes(value.phase) ||
    typeof value.detail !== 'string' ||
    value.detail.length > 4096
  )
    return false;
  if ((value.source !== null && !revision(value.source)) || (value.preparing !== null && !revision(value.preparing)))
    return false;
  if (
    value.displayed !== null &&
    !(record(value.displayed) && revision(value.displayed.revision) && counter(value.displayed.commit))
  )
    return false;
  if (
    value.activity !== null &&
    !(
      record(value.activity) &&
      typeof value.activity.provider === 'string' &&
      value.activity.provider.length > 0 &&
      value.activity.provider.length <= 128 &&
      (value.activity.state === 'working' || value.activity.state === 'idle')
    )
  )
    return false;
  if (
    value.phase === 'ready' &&
    !(
      value.displayed &&
      record(value.displayed) &&
      sameRevision(value.source as SourceRevision, value.displayed.revision as SourceRevision)
    )
  )
    return false;
  if (
    value.preparing !== null &&
    (value.phase !== 'preparing' || !sameRevision(value.preparing as SourceRevision, value.source as SourceRevision))
  )
    return false;
  if (value.phase === 'unknown' && (value.source !== null || value.preparing !== null)) return false;
  if (
    value.phase === 'disposed' &&
    (value.source !== null || value.preparing !== null || value.displayed !== null || value.activity !== null)
  )
    return false;
  return true;
}

// Native inspection uses the same vocabulary across module renderers. These attributes
// identify observed revisions; they do not authorize source writes or map DOM to props.
export function lifecycleAttributes(state: ArtifactLifecycle) {
  return {
    'data-artifact-phase': state.phase,
    'data-artifact-freshness': freshness(state),
    'data-artifact-source-revision': state.source?.source,
    'data-artifact-input-revision': state.source?.inputs,
    'data-artifact-displayed-revision': state.displayed?.revision.inputs,
    'data-artifact-commit': state.displayed?.commit,
  };
}
