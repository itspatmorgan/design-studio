import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptsPacket, validPacket } from './lib/wire.ts';
const scope = { session: 'session-a', runtime: 'runtime-a', identity: 'artifact-a' };
const source = {} as Window;
const packet = { channel: 'studio-dialkit-lab', version: 1, ...scope, kind: 'snapshot', sequence: 1, panel: { id: 'panel-a', name: 'Layout', config: { gap: [16, 0, 40] }, values: { gap: 16 } } };
test('inspector packets belong to the current sender, origin, document, session and artifact', () => {
  const event = { source, origin: 'https://studio.test', data: packet };
  assert.equal(acceptsPacket(event, source, event.origin, scope), true);
  assert.equal(acceptsPacket(event, null, event.origin, scope), false);
  assert.equal(acceptsPacket({ ...event, source: {} as Window }, source, event.origin, scope), false);
  assert.equal(acceptsPacket({ ...event, origin: 'https://elsewhere.test' }, source, event.origin, scope), false);
  for (const key of ['session', 'runtime', 'identity']) {
    assert.equal(acceptsPacket({ ...event, data: { ...packet, [key]: 'previous' } }, source, event.origin, scope), false);
  }
});
test('inspector transport rejects unsupported, malformed and oversized messages', () => {
  for (const value of [null, {}, { ...packet, version: 2 }, { ...packet, sequence: -1 }, { ...packet, kind: 'write-source' }, { ...packet, panel: null }, { ...packet, padding: 'x'.repeat(24000) }, { ...packet, value: NaN }, { ...packet, value: JSON.parse('{"__proto__":{}}') }]) assert.equal(validPacket(value), false);
  const cyclic: Record<string, unknown> = { ...packet }; cyclic.self = cyclic;
  assert.equal(validPacket(cyclic), false);
});
