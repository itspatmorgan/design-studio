import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildManifest } from '../build/build-manifest.js';
import { frontmatter } from './frontmatter.js';

test('platform context navigation carries the same declared titles as document headings', () => {
  const { manifest } = buildManifest({ write: false, quiet: true });
  const context = manifest.systemContent.find(
    section => section.owner?.id === 'platform.core' && section.title === 'Context',
  );
  assert.ok(context);
  assert.ok(context.artifacts.length > 0);
  for (const item of context.artifacts) {
    const source = fs.readFileSync(path.join('src/platform/context', item.path), 'utf8');
    const declared = frontmatter(source)?.title;
    assert.equal(typeof declared, 'string', item.path);
    assert.equal(item.title, declared, item.path);
  }
});
