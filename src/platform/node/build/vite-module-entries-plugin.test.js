import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import moduleEntries, { entryPaths } from './vite-module-entries-plugin.js';

test('module entry files are listed as glob keys in whichever root holds each module', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-module-entries-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of [
    'src/platform/modules/canvas/module.ts',
    'src/platform/modules/canvas/app.tsx',
    'src/platform/modules/view/module.ts',
    'src/modules/research/module.ts',
    'src/modules/research/app.tsx',
    'src/modules/research/open.tsx',
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), '');
  }
  const modules = [{ id: 'canvas' }, { id: 'view' }, { id: 'research' }];
  assert.deepEqual(entryPaths(modules, 'app.tsx', root), [
    '/platform/modules/canvas/app.tsx',
    '/modules/research/app.tsx',
  ]);
  assert.deepEqual(entryPaths(modules, 'open.tsx', root), ['/modules/research/open.tsx']);
  assert.deepEqual(entryPaths(modules, 'type.ts', root), []);
});

test('the browser module registry is given the module declarations under the key of the folder each is in', () => {
  const code = `const specs = import.meta.glob<ModuleSpec>(['/platform/modules/*/module.ts', '/modules/*/module.ts'], {
  eager: true,
  import: 'default',
});
export const MODULES = Object.values(specs);`;
  const result = moduleEntries().transform(code, path.resolve('src/platform/app/data/modules.ts'));
  assert.ok(result);
  const literal = JSON.parse(/const specs = (\{.*\});\nexport/s.exec(result.code)[1]);
  assert.equal(literal['/platform/modules/canvas/module.ts'].id, 'canvas');
  assert.ok(Object.keys(literal).every(key => /^\/(?:platform\/)?modules\/[a-z-]+\/module\.ts$/.test(key)));
});
