// Where items open and how an address is read back (roots.ts). Run with `pnpm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SUPPLIED_SYSTEMS_ROOT,
  SYSTEM_GLOB_ROOTS,
  SYSTEM_ROOTS,
  TEAM_SYSTEMS_ROOT,
  addressOf,
  isSectionKey,
  parseAddress,
  rootOf,
  setSections,
  setSystemFolders,
  systemFolder,
  systemIdOfPath,
  systemRoot,
} from './roots.ts';

setSections(['examples']);

test('a prototype opens under /prototypes, a section item under its section', () => {
  assert.equal(addressOf('patrick', 'hello-world'), '/prototypes/patrick/hello-world');
  assert.equal(addressOf('examples', 'sample'), '/examples/sample');
  assert.equal(addressOf('system-content', 'studio:rules'), '/systems/studio/rules');
  assert.equal(isSectionKey('patrick'), false);
  assert.equal(isSectionKey('systems'), true);
});

test('an address reads back in the new and the older form', () => {
  assert.deepEqual(parseAddress('/prototypes/patrick/hello-world/lofi/main'), {
    contributor: 'patrick',
    id: 'hello-world',
    rest: ['lofi', 'main'],
  });
  assert.deepEqual(parseAddress('/patrick/hello-world/lofi/main'), {
    contributor: 'patrick',
    id: 'hello-world',
    rest: ['lofi', 'main'],
  });
  assert.deepEqual(parseAddress('/examples/sample'), { contributor: 'examples', id: 'sample', rest: [] });
  assert.equal(parseAddress('/prototypes'), null);
  assert.equal(parseAddress('/prototypes/patrick'), null);
});

test('files are still found by contributor and id', () => {
  assert.equal(rootOf('patrick', 'hello-world'), 'prototypes/patrick/hello-world');
  assert.equal(rootOf('examples', 'sample'), 'examples/sample');
});

test('SystemContent Context addresses resolve to the docs folder', () => {
  assert.equal(addressOf('system-content', 'product:context'), '/systems/product/context');
  assert.deepEqual(parseAddress('/systems/product/context/personas'), {
    contributor: 'system-content',
    id: 'product:context',
    rest: ['personas'],
  });
  assert.equal(rootOf('system-content', 'product:context'), 'systems/product/context');
});

test('owner browser addresses round-trip while overviews remain outside prototype routing', () => {
  assert.deepEqual(parseAddress('/documentation/context/platform.core/context/config'), {
    contributor: 'system-content',
    id: 'platform.core:context',
    rest: ['config'],
  });
  assert.deepEqual(parseAddress('/knowledge/module.prototypes/skills/build-prototype/SKILL'), {
    contributor: 'system-content',
    id: 'module.prototypes:skills',
    rest: ['build-prototype', 'SKILL'],
  });
  assert.equal(parseAddress('/documentation/context/platform.core'), null);
  assert.equal(parseAddress('/knowledge/platform.core'), null);
});

test('the system roots are listed once, supplied first', () => {
  assert.deepEqual(SYSTEM_ROOTS, [SUPPLIED_SYSTEMS_ROOT, TEAM_SYSTEMS_ROOT]);
  assert.equal(SUPPLIED_SYSTEMS_ROOT, 'src/platform/systems');
  assert.equal(TEAM_SYSTEMS_ROOT, 'src/systems');
  assert.deepEqual(SYSTEM_GLOB_ROOTS, ['/platform/systems', '/systems']);
});

test('a system without a registered folder is taken to be in the team root', () => {
  setSystemFolders([]);
  assert.equal(systemFolder('product'), 'systems/product');
  assert.equal(rootOf('system-content', 'product:context'), 'systems/product/context');
  assert.equal(rootOf('systems', 'product'), 'systems/product/components');
});

test("registered folders decide where a system's files are", () => {
  setSystemFolders([
    ['studio', 'src/platform/systems/studio/'],
    ['product', 'src/systems/product'],
  ]);
  try {
    assert.equal(systemFolder('studio'), 'platform/systems/studio');
    assert.equal(systemRoot('studio'), 'platform/systems/studio');
    assert.equal(systemRoot('product'), 'systems/product');
    assert.equal(systemRoot('platform.core'), 'platform');
    assert.equal(systemRoot('module.canvas'), 'modules/canvas');
    assert.equal(rootOf('system-content', 'studio:context'), 'platform/systems/studio/context');
    assert.equal(rootOf('system-content', 'product:skills'), 'systems/product/skills');
    assert.equal(rootOf('systems', 'studio'), 'platform/systems/studio/components');
    // Addresses are the same wherever the folder is.
    assert.equal(addressOf('system-content', 'studio:context'), '/systems/studio/context');
    assert.deepEqual(parseAddress('/systems/studio/context/writing'), {
      contributor: 'system-content',
      id: 'studio:context',
      rest: ['writing'],
    });
  } finally {
    setSystemFolders([]);
  }
});

test('a path inside a system root belongs to that system', () => {
  assert.equal(systemIdOfPath('src/systems/product/system.ts'), 'product');
  assert.equal(systemIdOfPath('/src/platform/systems/studio/intro.tsx'), 'studio');
  assert.equal(systemIdOfPath('platform/systems/studio/components/button/button.tsx'), 'studio');
  assert.equal(systemIdOfPath('systems/product/components'), 'product');
  assert.equal(systemIdOfPath('src/platform/app/styles.css'), undefined);
  assert.equal(systemIdOfPath('src/platform/systems'), undefined);
  assert.equal(systemIdOfPath('src/prototypes/pat/systems/x/y.ts'), undefined);
});
