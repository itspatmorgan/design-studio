// How archived prototypes are left out of a deploy (archive.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forDeploy, linksToArchived, parseStatus } from './archive.ts';

const proto = (id: string, extra: object = {}) => ({ id, contributorKey: 'patrick', ...extra });

test('parseStatus accepts only statuses', () => {
  assert.equal(parseStatus('archived'), 'archived');
  assert.equal(parseStatus('active'), 'active');
  assert.equal(parseStatus('done'), null);
  assert.equal(parseStatus(undefined), null);
  assert.equal(parseStatus(3), null);
});

test('a deploy keeps active prototypes as they are', () => {
  const p = proto('a');
  assert.deepEqual(forDeploy([p]), { kept: [p], archived: [] });
});

test('a deploy leaves out an archived prototype whole', () => {
  const { kept, archived } = forDeploy([proto('old', { status: 'archived' }), proto('new')]);
  assert.deepEqual(
    kept.map(p => p.id),
    ['new'],
  );
  assert.deepEqual(archived, ['/prototypes/patrick/old/**']);
});

test('a canvas link into an archived prototype is found, but not into one with a longer name', () => {
  const canvas = '{"link":"http://localhost:5173/patrick/old/lofi/main"}';
  assert.deepEqual(linksToArchived(canvas, ['/patrick/old']), ['/patrick/old']);
  assert.deepEqual(linksToArchived('{"link":"http://localhost:5173/patrick/older/lofi/main"}', ['/patrick/old']), []);
});

test('a link at the end of a sentence, or with nothing after it, is still found', () => {
  assert.deepEqual(linksToArchived('Open /patrick/old.', ['/patrick/old']), ['/patrick/old']);
  assert.deepEqual(linksToArchived('Open /patrick/old', ['/patrick/old']), ['/patrick/old']);
});
