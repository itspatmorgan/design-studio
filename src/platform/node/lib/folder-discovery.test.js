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
import {
  discoverSystemFolders,
  systemDirOf,
  systemFolderTaken,
  systemIdsIn,
  systemPath,
  newSystemDir,
} from './system-folders.js';
import { moduleProblems, moduleRootProblems } from '../../core/modules/index.ts';
import { systemRootProblems } from '../../modules/systems/spec.ts';
import { readResourceDirectory } from './resource-directory.js';
import { auditResourceIdentities } from './resource-identity-audit.js';

for (const [kind, discover, dirOf, taken, idsIn, absolute, newDir] of [
  ['module', discoverModuleFolders, moduleDirOf, moduleFolderTaken, moduleIdsIn, modulePath, newModuleDir],
  ['system', discoverSystemFolders, systemDirOf, systemFolderTaken, systemIdsIn, systemPath, newSystemDir],
])
  test(`${kind} discovery preserves roots, new destinations, and unambiguous identity`, t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-folders-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const supplied = `src/platform/${kind}s`,
      team = `src/${kind}s`;
    const write = (file, source) => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), source);
    };
    write(`${supplied}/studio/${kind}.ts`, "export default {role:'platform', studioId:'abcdefghjkmnpqrs'};");
    write(`${team}/brand/${kind}.ts`, "export default {role:'prototype', studioId:'0123456789abcdef'};");
    write(`${team}/product/${kind}.ts`, "export default {role:'prototype', studioId:'cdefghjkmnpqrstv'};");
    fs.mkdirSync(path.join(root, team, 'empty'));
    assert.deepEqual(discover(root), [
      { id: 'studio', dir: `${supplied}/studio/` },
      { id: 'brand', dir: `${team}/brand/` },
      { id: 'product', dir: `${team}/product/` },
    ]);
    assert.deepEqual(idsIn(root), ['brand', 'product', 'studio']);
    for (const [id, base] of [
      ['studio', supplied],
      ['brand', team],
      ['missing', team],
    ]) {
      assert.equal(dirOf(root, id), `${base}/${id}`);
      assert.equal(absolute(root, id), path.join(root, base, id));
    }
    assert.equal(newDir('missing'), `${team}/missing`);
    for (const id of ['studio', 'brand', 'empty']) assert.equal(taken(root, id), true);
    assert.equal(taken(root, 'missing'), false);
    fs.rmSync(path.join(root, team, 'empty'), { recursive: true });
    fs.mkdirSync(path.join(root, 'contributors'));
    if (kind === 'system') {
      assert.deepEqual(Object.keys(readResourceDirectory(root).systemIds).sort(), ['brand', 'product', 'studio']);
      assert.deepEqual(
        auditResourceIdentities(root, {})
          .resources.filter(item => item.kind === 'system')
          .map(item => item.key)
          .sort(),
        ['brand', 'product', 'studio'],
      );
    }
    write(`${team}/studio/${kind}.ts`, "export default {role:'prototype'};");
    const duplicate = discover(root);
    assert.equal(duplicate.filter(item => item.id === 'studio').length, 2);
    if (kind === 'module') {
      assert.deepEqual(moduleRootProblems(duplicate.filter(item => item.dir !== `${team}/studio/`)), []);
      assert.match(
        moduleRootProblems(duplicate).join('\n'),
        /studio: found in src\/platform\/modules\/studio\/ and src\/modules\/studio\//,
      );
      assert.match(
        moduleProblems({ id: 'wrong' }, 'studio', `${team}/studio/`).join('\n'),
        /src\/modules\/studio\/module.ts/,
      );
    } else {
      assert.match(
        systemRootProblems(
          duplicate.map(item => ({ ...item, role: item.dir.startsWith('src/platform') ? 'platform' : 'prototype' })),
        ).join('\n'),
        /studio: found in src\/platform\/systems\/studio\/ and src\/systems\/studio\//,
      );
      assert.throws(() => readResourceDirectory(root), /system studio is also in another system root/);
    }
    fs.rmSync(path.join(root, team, 'studio'), { recursive: true });
    fs.rmSync(path.join(root, supplied), { recursive: true });
    assert.deepEqual(
      discover(root).map(item => item.id),
      ['brand', 'product'],
    );
    fs.rmSync(path.join(root, team), { recursive: true });
    assert.deepEqual(discover(root), []);
  });
