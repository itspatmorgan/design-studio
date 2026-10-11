import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArtifactLifecycle, freshness, validLifecycle } from './state.ts';
const a = { source: 'a'.repeat(64), inputs: '1'.repeat(64) };
const b = { source: 'b'.repeat(64), inputs: '2'.repeat(64) };
test('source changes invalidate preparation without pretending an agent is working', () => {
  const l = createArtifactLifecycle();
  const first = l.prepare(a)!;
  l.commit(first);
  l.observe(b);
  assert.equal(freshness(l.state), 'stale');
  assert.equal(l.state.activity, null);
  assert.equal(l.commit(first), false);
  assert.deepEqual(l.state.displayed?.revision, a);
  const second = l.prepare(b)!;
  assert.equal(l.commit(second), true);
  assert.equal(freshness(l.state), 'current');
});
test('late failures and commits cannot replace a newer attempt even for equal source', () => {
  const l = createArtifactLifecycle();
  const first = l.prepare(a)!;
  const second = l.prepare(a)!;
  assert.equal(l.fail(first, 'old error', false), false);
  assert.equal(l.commit(first), false);
  assert.equal(l.commit(second), true);
  assert.equal(l.fail(second, 'late error', false), false);
});
test('failed preparation can retain last working content; render failure can clear it', () => {
  const l = createArtifactLifecycle();
  l.commit(l.prepare(a)!);
  l.fail(l.prepare(b)!, 'compile failed', true);
  assert.equal(freshness(l.state), 'stale');
  assert.equal(l.state.phase, 'error');
  l.fail(l.prepare(b)!, 'render failed', false);
  assert.equal(freshness(l.state), 'empty');
  l.commit(l.prepare(b)!);
  assert.equal(freshness(l.state), 'current');
});
test('dependency-only changes invalidate and unknown evidence never becomes current', () => {
  const l = createArtifactLifecycle();
  l.commit(l.prepare(a)!);
  l.observe({ ...a, inputs: b.inputs });
  assert.equal(freshness(l.state), 'stale');
  l.unknown();
  assert.equal(freshness(l.state), 'unknown');
  assert.equal(l.state.phase, 'unknown');
});
test('pause and disposal invalidate work; resume needs a fresh preparation', () => {
  const l = createArtifactLifecycle();
  const first = l.prepare(a)!;
  l.pause();
  l.observe(b);
  assert.equal(l.prepare(b), null);
  assert.equal(l.commit(first), false);
  l.resume();
  const next = l.prepare(b)!;
  l.dispose();
  assert.equal(l.commit(next), false);
  assert.equal(l.prepare(a), null);
  assert.equal(l.state.displayed, null);
});
test('transport rejects fabricated readiness, oversized details and unsupported fields', () => {
  const l = createArtifactLifecycle();
  l.commit(l.prepare(a)!);
  assert.equal(validLifecycle(l.state), true);
  for (const patch of [
    { source: b },
    { attempt: -1 },
    { detail: 'x'.repeat(4097) },
    { activity: { provider: '', state: 'working' } },
    { phase: new String('ready') },
    { source: { source: 'x', inputs: a.inputs } },
  ])
    assert.equal(validLifecycle({ ...l.state, ...patch }), false);
});

test('only an explicit activity provider supplies activity; source changes leave it independent', () => {
  const l = createArtifactLifecycle();
  l.observe(a);
  assert.equal(l.state.activity, null);
  l.activity('harness', 'working');
  l.observe(b);
  assert.deepEqual(l.state.activity, { provider: 'harness', state: 'working' });
  l.activity('harness', null);
  assert.equal(l.state.activity, null);
  assert.throws(() => l.activity('', 'idle'));
});

test('a renderer can report an error without inventing a source revision', () => {
  const l = createArtifactLifecycle();
  l.error('unavailable runtime', false);
  assert.equal(l.state.phase, 'error');
  assert.equal(l.state.source, null);
  assert.equal(validLifecycle(l.state), true);
  const ticket = l.prepare(a)!;
  l.error('runtime failed', false);
  assert.equal(l.commit(ticket), false);
});
