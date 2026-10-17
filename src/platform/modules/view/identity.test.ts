import assert from 'node:assert/strict';
import { test } from 'node:test';
import spec from './type.ts';
import { resourceId } from '#studio/files';

test('fidelity toggles preserve identity, source and prose and reject false markers', () => {
  const id = resourceId('0123456789abcdef');
  const source = 'export default function Screen() { return null; }\n';
  const { isLofi, setLofi } = spec.fidelity!;
  for (const prefix of ['', '\uFEFF', '/** Checkout notes */\n']) {
    const identified = spec.identity!.write(prefix + source, id);
    const on = setLofi(identified, true);
    assert.equal(isLofi(on), true);
    assert.equal(setLofi(on, true), on);
    assert.equal(setLofi(on, false), identified);
    assert.equal(setLofi(identified, false), identified);
    assert.equal(spec.identity!.read(on), id);
    const identifiedLofi = spec.identity!.write(setLofi(prefix + source, true), id);
    assert.equal(spec.identity!.read(setLofi(identifiedLofi, false)), id);
  }
  for (const header of ['// @lofi\n', '/**\n * Checkout, first try.\n * @lofi\n */\n']) {
    assert.equal(isLofi(header + source), true);
    const off = setLofi(header + source, false);
    assert.equal(isLofi(off), false);
    assert.ok(off.endsWith(source));
    if (header.includes('Checkout')) assert.ok(off.includes('Checkout, first try.'));
  }
  for (const text of ['', source, source + '// @lofi', '/** @lofioutdated */\n' + source])
    assert.equal(isLofi(text), false);
});

import { viewIdentity } from './identity.ts';
const first = resourceId('0123456789abcdef'),
  second = resourceId('abcdefghjkmnpqrs');

test('view identity survives lofi comments, BOM and CRLF without rewriting executable source', () => {
  const source = '\uFEFF/** @lofi */\r\nexport default function View() { return "@studio-id example"; }\r\n';
  const written = viewIdentity.write(source, first);
  assert.equal(viewIdentity.read(written), first);
  assert.equal(written, '\uFEFF/** @studio-id 0123456789abcdef */\r\n' + source.slice(1));
  assert.equal(viewIdentity.write(written, first), written);
  assert.equal(viewIdentity.read(viewIdentity.write(written, second)), second);
  assert.equal(viewIdentity.read(source), null);
  assert.throws(() => viewIdentity.read('/** @studio-id */\nexport default null;'));
  assert.throws(() =>
    viewIdentity.read(`/** @studio-id ${first} */\n/** @studio-id ${second} */\nexport default null;`),
  );
});
