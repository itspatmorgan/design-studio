import test from 'node:test';
import assert from 'node:assert/strict';
import { manualChapterEnabled } from './manual-pages.js';

test('Manual availability follows capability registration while malformed metadata remains repairable', () => {
  assert.equal(manualChapterEnabled({ module: 'canvas' }, ['canvas']), true);
  assert.equal(manualChapterEnabled({ module: 'canvas' }, ['document']), false);
  assert.equal(manualChapterEnabled({ module: 'removed-capability' }, []), false);
  assert.equal(manualChapterEnabled({ title: 'Introduction' }, []), true);
  assert.equal(manualChapterEnabled({ module: 42 }, []), true, 'invalid metadata must reach validation');
});
