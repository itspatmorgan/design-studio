import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptsPacket, validPacket, maxPacketCharacters } from './lib/wire.ts';
const scope = { session: 'session-a', runtime: 'runtime-a', identity: 'artifact-a' };
const source = {} as Window;
const packet = { channel: 'studio-dialkit', version: 1, ...scope, kind: 'snapshot', sequence: 1, panel: { id: 'panel-a', name: 'Layout', config: { gap: [16, 0, 40] }, values: { gap: 16 } } };
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
  for (const value of [null, {}, { ...packet, version: 2 }, { ...packet, sequence: -1 }, { ...packet, kind: 'write-source' }, { ...packet, panel: null }, { ...packet, padding: 'x'.repeat(maxPacketCharacters) }, { ...packet, value: NaN }, { ...packet, value: JSON.parse('{"__proto__":{}}') }]) assert.equal(validPacket(value), false);
  const cyclic: Record<string, unknown> = { ...packet }; cyclic.self = cyclic;
  assert.equal(validPacket(cyclic), false);
});

test('native complex controls and image data survive transport without loosening structural guards', () => {
  const values = { position: { x: 25, y: -15 }, spring: { type: 'spring', stiffness: 181, damping: 21, mass: 1.1 }, easing: { type: 'easing', duration: 0.45, ease: [0.2, 0.8, 0.4, 1] }, upload: 'data:image/png;base64,' + 'a'.repeat(50000), nested: { gap: 18 } };
  assert.equal(validPacket({ ...packet, panel: { ...packet.panel, values } }), true);
  assert.equal(validPacket({ ...packet, kind: 'update', id: 'panel-a', path: 'upload', value: values.upload }), true);
  assert.equal(validPacket({ ...packet, kind: 'update', id: 'panel-a', path: 'position', value: { x: Infinity, y: 0 } }), false);
});
