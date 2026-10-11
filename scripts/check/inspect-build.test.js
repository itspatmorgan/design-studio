import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectBuild } from './inspect-build.js';

test('startup measurement follows static dependencies once and validates lazy references without counting them', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-output-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.vite'));
  const manifest = {
    'index.html': { isEntry: true, file: 'app.js', css: ['app.css'], imports: ['shared'], dynamicImports: ['lazy'] },
    shared: { file: 'shared.js', imports: ['cycle'] },
    cycle: { file: 'cycle.js', imports: ['shared'] },
    lazy: { file: 'lazy.js' },
  };
  for (const file of ['app.js', 'app.css', 'shared.js', 'cycle.js', 'lazy.js'])
    fs.writeFileSync(path.join(root, file), '12345');
  fs.writeFileSync(path.join(root, '.vite/manifest.json'), JSON.stringify(manifest));
  const result = inspectBuild(root);
  assert.equal(result.requests, 4);
  assert.equal(result.bytes, 20);
  assert.ok(!result.assets.some(asset => asset.file === 'lazy.js'));
  fs.rmSync(path.join(root, 'lazy.js'));
  assert.throws(() => inspectBuild(root), /ENOENT/);
  manifest.lazy.file = '../outside.js';
  fs.writeFileSync(path.join(root, '.vite/manifest.json'), JSON.stringify(manifest));
  assert.throws(() => inspectBuild(root), /escapes output/);
});
