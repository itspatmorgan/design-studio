import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import build from './build.ts';
import { sourceFile } from '../../node/build/files/source.js';

test('Manual source contribution keeps malformed chapters repairable and disappears without contributed data', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-manual-source-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const chapter = 'src/platform/modules/documentation/pages/index.md';
  const damaged = 'src/platform/modules/documentation/pages/draft.md';
  fs.mkdirSync(path.dirname(path.join(root, chapter)), { recursive: true });
  fs.writeFileSync(path.join(root, chapter), '# Source');
  fs.writeFileSync(path.join(root, damaged), '---\ntitle: broken');
  const data = {
    manual: [
      {
        slug: 'index',
        title: 'Index',
        description: '',
        section: null,
        source: '/platform/modules/documentation/pages/index.md',
      },
    ],
  };
  const allowed = build.sourceFiles(data, { root });
  assert.ok(allowed.includes(chapter));
  assert.ok(allowed.includes(damaged));
  for (const file of [chapter, damaged]) {
    const before = sourceFile(root, allowed, { action: 'read', path: file });
    assert.equal(
      sourceFile(root, allowed, { action: 'write', path: file, content: '# Edited', base: before.body.version }).status,
      undefined,
    );
  }
  const unavailable = build.sourceFiles(undefined, { root });
  assert.deepEqual(unavailable, []);
  assert.equal(sourceFile(root, unavailable, { action: 'read', path: chapter }).status, 404);
});
