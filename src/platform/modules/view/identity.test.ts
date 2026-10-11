import assert from 'node:assert/strict';
import { test } from 'node:test';
import spec from './type.ts';
import { resourceId } from '../../core/fileTypes.ts';

test('lofi toggling preserves view identity and executable contents in both header orders', () => {
  const id = resourceId('0123456789abcdef');
  const source = 'export default function Screen() { return null; }\n';
  const identified = spec.identity!.write(source, id);
  const lofi = spec.fidelity!.setLofi(identified, true);
  assert.equal(spec.identity!.read(lofi), id);
  assert.equal(spec.fidelity!.setLofi(lofi, false), identified);
  const identifiedLofi = spec.identity!.write(spec.fidelity!.setLofi(source, true), id);
  assert.equal(spec.identity!.read(spec.fidelity!.setLofi(identifiedLofi, false)), id);
});
