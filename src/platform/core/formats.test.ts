import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMAT_VERSIONS, formatVersionProblem } from './formats.ts';

test('the current version is accepted and every other value names the file', () => {
  for (const format of Object.keys(FORMAT_VERSIONS) as (keyof typeof FORMAT_VERSIONS)[]) {
    assert.equal(formatVersionProblem(FORMAT_VERSIONS[format], format, 'a.json'), null);
    assert.match(formatVersionProblem(undefined, format, 'a.json')!, /^a\.json: add "formatVersion": 1/);
    assert.match(formatVersionProblem(0, format, 'a.json')!, /^a\.json: formatVersion is 0.*current version/);
    assert.match(formatVersionProblem(99, format, 'a.json')!, /^a\.json: formatVersion is 99.*newer studio/);
    assert.match(formatVersionProblem('1', format, 'a.json')!, /^a\.json: formatVersion is "1"/);
  }
});
