import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMountGate, MAX_LIVE, pickEvictions } from './liveViews.ts';
test('canvas admission spreads mounting without changing retained previews', () => {
  const admit = createMountGate();
  assert.equal(admit(0), true);
  assert.equal(admit(100), false);
  assert.equal(admit(150), true);
});
test('offscreen previews survive until budget pressure, while removal disposes immediately', () => {
  const lastSeen = new Map(Array.from({ length: MAX_LIVE }, (_, i) => [String(i), 0]));
  const onCanvas = new Set(lastSeen.keys());
  assert.deepEqual(pickEvictions({ lastSeen, visible: new Set(), onCanvas, now: 10000 }), []);
  onCanvas.delete('0');
  assert.deepEqual(pickEvictions({ lastSeen, visible: new Set(), onCanvas, now: 1 }), ['0']);
});
test('budget eviction protects visible and recently seen embeds; eligible oldest leaves first', () => {
  const lastSeen = new Map(Array.from({ length: MAX_LIVE + 2 }, (_, i) => [String(i), i]));
  const onCanvas = new Set(lastSeen.keys());
  assert.deepEqual(pickEvictions({ lastSeen, visible: new Set(['0']), onCanvas, now: 1000 }), []);
  assert.deepEqual(pickEvictions({ lastSeen, visible: new Set(['0']), onCanvas, now: 10000 }), ['1', '2']);
});
