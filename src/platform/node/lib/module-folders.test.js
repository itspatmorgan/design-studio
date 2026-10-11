// Where modules live on disk: the supplied root (src/platform/modules) and the team's (src/modules).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  discoverModuleFolders,
  moduleDirOf,
  moduleFolderTaken,
  moduleIdsIn,
  modulePath,
  newModuleDir,
} from './module-folders.js';
import { moduleProblems, moduleRootProblems } from '../../core/modules/index.ts';
import { MODULES, MODULE_DIRS, declarationProblems } from './module-catalog.js';
import { moduleFolder } from '../../core/roots.ts';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-module-folders-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write('src/platform/modules/canvas/module.ts', 'export default {};');
  write('src/platform/modules/view/module.ts', 'export default {};');
  write('src/modules/research/module.ts', 'export default {};');
  write('src/modules/notes/module.ts', 'export default {};');
  return { root, write };
}

test('modules are found in both roots, supplied first, by the folder they are in', t => {
  const { root } = fixture(t);
  assert.deepEqual(discoverModuleFolders(root), [
    { id: 'canvas', dir: 'src/platform/modules/canvas/' },
    { id: 'view', dir: 'src/platform/modules/view/' },
    { id: 'notes', dir: 'src/modules/notes/' },
    { id: 'research', dir: 'src/modules/research/' },
  ]);
  assert.deepEqual(moduleIdsIn(root), ['canvas', 'notes', 'research', 'view']);
  assert.equal(moduleDirOf(root, 'canvas'), 'src/platform/modules/canvas');
  assert.equal(moduleDirOf(root, 'research'), 'src/modules/research');
  assert.equal(modulePath(root, 'canvas'), path.join(root, 'src/platform/modules/canvas'));
});

test('a module that is not installed is placed in the team root, where new modules are made', t => {
  const { root } = fixture(t);
  assert.equal(moduleDirOf(root, 'quote'), 'src/modules/quote');
  assert.equal(newModuleDir('quote'), 'src/modules/quote');
  fs.rmSync(path.join(root, 'src/platform/modules'), { recursive: true });
  assert.deepEqual(
    discoverModuleFolders(root).map(found => found.id),
    ['notes', 'research'],
  );
  fs.rmSync(path.join(root, 'src/modules'), { recursive: true });
  assert.deepEqual(discoverModuleFolders(root), []);
});

test('an id is taken when a folder with that name is in either root', t => {
  const { root } = fixture(t);
  fs.mkdirSync(path.join(root, 'src/modules/empty'), { recursive: true });
  for (const id of ['canvas', 'research', 'empty']) assert.equal(moduleFolderTaken(root, id), true);
  assert.equal(moduleFolderTaken(root, 'quote'), false);
});

test('an id in both roots is an error with a message that says which to rename', t => {
  const { root, write } = fixture(t);
  write('src/modules/view/module.ts', 'export default {};');
  const found = discoverModuleFolders(root);
  assert.equal(found.filter(({ id }) => id === 'view').length, 2);
  const problems = moduleRootProblems(found);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^view: found in src\/platform\/modules\/view\/ and src\/modules\/view\//);
  assert.match(problems[0], /A team module can't reuse a supplied module's id: rename the one in src\/modules\//);
  assert.deepEqual(moduleRootProblems(discoverModuleFolders(fixture(t).root)), []);
  // The supplied module keeps the id; the declaration of each folder is checked where it is.
  assert.match(moduleProblems({ id: 'x' }, 'view', 'src/modules/view/').join('\n'), /src\/modules\/view\/module\.ts/);
});

test('installed modules are registered with the root they were found in', () => {
  for (const id of Object.keys(MODULES)) {
    assert.match(MODULE_DIRS[id], new RegExp(`^src/platform/modules/${id}/$`), id);
    assert.equal(moduleFolder(id), `platform/modules/${id}`, id);
  }
  assert.deepEqual(declarationProblems(), []);
});
