import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import build from './build.ts';
import { sourceFile } from '../../node/build/files/source.js';

test('fresh-process Manual discovery filters capabilities and keeps invalid chapters repairable', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-manual-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const folder = 'src/platform/modules/documentation/pages';
  fs.mkdirSync(path.join(root, folder), { recursive: true });
  const chapters = {
    index: 'title: Introduction\norder: 1',
    canvas: 'title: Canvas\norder: 2\nmodule: canvas',
    document: 'title: Documents\norder: 3\nmodule: document',
    removed: 'title: Removed\norder: 4\nmodule: removed-capability',
    invalid: 'title: Invalid\norder: 5\nmodule: 42',
    damaged: 'title: broken [',
  };
  for (const [name, metadata] of Object.entries(chapters))
    fs.writeFileSync(path.join(root, folder, name + '.md'), '---\n' + metadata + '\n---\nBody');
  // A fresh process reproduces native build-hook loading without a browser module registry.
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import build from ${JSON.stringify(new URL('./build.ts', import.meta.url).href)};
    const root = ${JSON.stringify(root)}, diagnostics = [];
    const result = build.manifest({root, enabled: ['canvas'], out: {error: message => diagnostics.push(message)}});
    console.log(JSON.stringify({result, diagnostics, sources: build.sourceFiles(result.data, {root}), watch: build.watch}));
  `,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const {
    result: discovered,
    diagnostics,
    sources,
    watch,
  } = JSON.parse(result.stdout) as {
    result: ReturnType<typeof build.manifest>;
    diagnostics: string[];
    sources: string[];
    watch: string[];
  };
  assert.deepEqual(
    discovered.data.manual.map(page => page.slug),
    ['index', 'canvas'],
  );
  assert.equal(discovered.errors, 2);
  assert.ok(diagnostics.some(message => message.includes('invalid.md')));
  assert.ok(diagnostics.some(message => message.includes('damaged.md')));
  assert.deepEqual(watch, [folder]);
  assert.deepEqual(
    [...new Set(sources)].sort(),
    Object.keys(chapters)
      .map(name => `${folder}/${name}.md`)
      .sort(),
  );
  const disabled = build.manifest({ root, enabled: [], out: { ...console, error() {} } });
  assert.deepEqual(
    disabled.data.manual.map(page => page.slug),
    ['index'],
  );
  for (const name of ['index', 'invalid', 'damaged']) {
    const file = `${folder}/${name}.md`;
    const before = sourceFile(root, sources, { action: 'read', path: file });
    assert.equal(
      sourceFile(root, sources, { action: 'write', path: file, content: '# Repaired', base: before.body.version })
        .status,
      undefined,
    );
  }
  const unavailable = build.sourceFiles(undefined, { root });
  assert.deepEqual(unavailable, []);
  assert.equal(sourceFile(root, unavailable, { action: 'read', path: `${folder}/index.md` }).status, 404);
});
