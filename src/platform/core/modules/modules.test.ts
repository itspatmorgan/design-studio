// The checks on a module's declaration (index.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compatible, listProblems, moduleProblems, sectionKeys, type ModuleSpec } from './index.ts';

const examples: ModuleSpec = {
  optional: false,
  lib: false,
  id: 'examples',
  label: 'Examples',
  version: '0.1.0',
  section: { key: 'examples', folder: 'src/examples' },
};

test('a well formed module has no problems', () => {
  assert.deepEqual(moduleProblems(examples, 'examples'), []);
  assert.deepEqual(moduleProblems({ optional: false, lib: false, id: 'x', label: 'X', version: '1.2.3' }, 'x'), []);
});

test('the id has to be the folder name', () => {
  assert.match(moduleProblems({ ...examples, id: 'other' }, 'examples')[0], /must match the folder name, "examples"/);
});

test('a missing label or a malformed version is named', () => {
  assert.match(moduleProblems({ ...examples, label: ' ' }, 'examples')[0], /add a label/);
  assert.match(moduleProblems({ ...examples, version: '1' }, 'examples')[0], /version should look like 0\.1\.0/);
});

test('a section folder can not climb out of the repo', () => {
  assert.match(
    moduleProblems({ ...examples, section: { key: 'examples', folder: '../examples' } }, 'examples')[0],
    /inside the repo/,
  );
  assert.match(
    moduleProblems({ ...examples, section: { key: 'examples', folder: '/etc' } }, 'examples')[0],
    /inside the repo/,
  );
  assert.match(
    moduleProblems({ ...examples, section: { key: 'Examples!', folder: 'src/examples' } }, 'examples')[0],
    /section\.key/,
  );
});

test('anything that is not an object is not a module', () => {
  assert.match(moduleProblems(undefined, 'examples')[0], /must export a module/);
  assert.match(moduleProblems('examples', 'examples')[0], /must export a module/);
});

test('two modules can not share a section key or folder', () => {
  const other: ModuleSpec = {
    optional: false,
    lib: false,
    id: 'other',
    label: 'Other',
    version: '0.1.0',
    section: { key: 'examples', folder: 'src/examples' },
  };
  const problems = listProblems([examples, other]);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /both use the section key "examples"/);
  assert.match(problems[1], /both keep their files in src\/examples/);
});

test('section keys skip modules with no section', () => {
  assert.deepEqual(sectionKeys([examples, { optional: false, lib: false, id: 'x', label: 'X', version: '0.1.0' }]), [
    'examples',
  ]);
});

test('modules cannot replace the core settings page', () => {
  assert.match(listProblems([{ ...examples, section: { key: 'settings' } }]).join(' '), /reserved core page key/);
});

test('a policy must be one a section can have', () => {
  assert.deepEqual(
    moduleProblems(
      { ...examples, section: { key: 'examples', folder: 'src/examples', policy: 'maintainers' } },
      'examples',
    ),
    [],
  );
  assert.match(
    moduleProblems(
      { ...examples, section: { key: 'examples', folder: 'src/examples', policy: 'owner' as 'open' } },
      'examples',
    )[0],
    /section\.policy/,
  );
});

test('items must be a known kind, in a folder directly under src', () => {
  assert.deepEqual(
    moduleProblems(
      { ...examples, section: { key: 'examples', folder: 'src/examples', items: 'prototypes' } },
      'examples',
    ),
    [],
  );
  assert.match(
    moduleProblems(
      { ...examples, section: { key: 'examples', folder: 'src/examples', items: 'files' as 'prototypes' } },
      'examples',
    )[0],
    /section\.items/,
  );
  assert.deepEqual(
    moduleProblems(
      { ...examples, section: { key: 'examples', folder: 'src/examples', items: 'prototypes', byPerson: true } },
      'examples',
    ),
    [],
  );
  assert.match(
    moduleProblems(
      { ...examples, section: { key: 'examples', folder: 'src/examples', byPerson: true } },
      'examples',
    )[0],
    /byPerson/,
  );
  assert.match(
    moduleProblems(
      { ...examples, section: { key: 'examples', folder: 'src/platform/examples', items: 'prototypes' } },
      'examples',
    )[0],
    /directly under src/,
  );
});

test('a module may say the oldest platform it works with', () => {
  assert.deepEqual(moduleProblems({ ...examples, requires: '0.1.0' }, 'examples'), []);
  assert.match(moduleProblems({ ...examples, requires: '^0.1' }, 'examples')[0], /requires should look like 0\.1\.0/);
});

test('a module needing a newer platform than this one is not compatible', () => {
  assert.equal(compatible({}, '0.1.0'), true);
  assert.equal(compatible({ requires: '0.1.0' }, '0.1.0'), true);
  assert.equal(compatible({ requires: '0.1.0' }, '0.2.3'), true);
  assert.equal(compatible({ requires: '0.2.0' }, '0.1.9'), false);
  assert.equal(compatible({ requires: '1.0.0' }, '0.9.9'), false);
  assert.equal(compatible({ requires: '0.10.0' }, '0.9.0'), false);
});

test('module capability decisions require explicit booleans', () => {
  for (const field of ['optional', 'lib']) {
    const declaration = { ...examples };
    delete (declaration as Record<string, unknown>)[field];
    assert.ok(moduleProblems(declaration, 'examples').some(problem => problem.includes(field)));
  }
});
