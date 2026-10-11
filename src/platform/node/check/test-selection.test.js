import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  selectTests,
  changedPaths,
  planTests,
  matches,
  discoverTests,
  importedDependencies,
} from './test-selection.js';

const catalog = JSON.parse(fs.readFileSync('src/platform/node/check/test-groups.json', 'utf8'));
const available = Object.values(catalog.groups).flatMap(group => group.tests);
const select = files => selectTests(files, catalog, available);

test('authoring keeps publishing validation without platform regressions; Studio code is runtime', () => {
  for (const file of [
    'src/prototypes/pat/example/main.tsx',
    'src/systems/product/components/button.tsx',
    'contributors/pat.json',
    'public/logo.svg',
  ])
    assert.deepEqual(select([file]).groups, [], file);
  assert.deepEqual(select(['src/platform/app/shell/MainNav.tsx']).groups, ['runtime']);
  assert.deepEqual(select(['src/platform/systems/studio/components/button/button.tsx']).groups, ['runtime']);
});
test('shared dependencies and mixed changes include setup and publishing only when affected', () => {
  assert.deepEqual(select(['src/platform/app/router.tsx']).groups, ['runtime', 'publishing']);
  assert.deepEqual(select(['src/platform/modules/onboarding/progress.ts']).groups, ['runtime', 'setup']);
  assert.deepEqual(select(['src/platform/core/config.ts']).groups, ['runtime', 'setup', 'publishing']);
  const result = select(['src/platform/app/shell/MainNav.tsx', 'src/platform/modules/onboarding/progress.ts']);
  assert.deepEqual(result.groups, ['runtime', 'setup']);
  assert.equal(new Set(result.tests).size, result.tests.length);
});
test('a module declaration or file type selects publishing validation in either module root', () => {
  for (const root of ['src/platform/modules/canvas', 'src/modules/research'])
    for (const file of ['module.ts', 'type.ts', 'node/create.js'])
      assert.ok(select([`${root}/${file}`]).groups.includes('publishing'), `${root}/${file}`);
  for (const root of ['src/platform/modules/canvas', 'src/modules/research'])
    assert.deepEqual(select([`${root}/Canvas.tsx`]).groups, ['runtime'], root);
});
test('module test discovery includes JavaScript and TypeScript procedures in both module roots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'module-tests-'));
  try {
    for (const directory of ['src/modules/example', 'src/platform/modules/supplied']) {
      fs.mkdirSync(path.join(root, directory), { recursive: true });
      for (const file of ['prepare.test.js', 'runtime.test.ts']) fs.writeFileSync(path.join(root, directory, file), '');
    }
    assert.deepEqual(discoverTests(root), [
      'src/modules/example/prepare.test.js',
      'src/modules/example/runtime.test.ts',
      'src/platform/modules/supplied/prepare.test.js',
      'src/platform/modules/supplied/runtime.test.ts',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test('unknown paths, dependencies, missing comparison, and new tests fail closed to the full suite', () => {
  for (const file of [
    'new-feature/file.js',
    'pnpm-lock.yaml',
    '.github/workflows/checks.yml',
    'src/platform/node/check/test-groups.json',
    '../outside',
  ])
    assert.equal(select([file]).full, true, file);
  assert.equal(selectTests([], catalog, [...available, 'src/modules/new/unknown.test.ts']).full, true);
  assert.equal(planTests('00000000', 'HEAD').full, true);
  assert.equal(selectTests([], catalog, available, { full: true }).tests.length, available.length);
  const actual = discoverTests();
  assert.deepEqual(
    actual.filter(file => !available.includes(file)),
    [],
    'Every discovered test must have a reviewed group.',
  );
});
test('dependency glob matching respects path separators', () => {
  assert.equal(matches('src/modules/research/module.ts', 'src/modules/*/module.ts'), true);
  assert.equal(matches('src/modules/research/other/module.ts', 'src/modules/*/module.ts'), false);
  assert.equal(matches('src/platform/modules/canvas/module.ts', 'src/platform/modules/*/module.ts'), true);
  assert.equal(matches('src/platform/modules/canvas/other/module.ts', 'src/platform/modules/*/module.ts'), false);
  assert.equal(matches('src/platform/modules/canvas/module.ts', 'src/modules/*/module.ts'), false);
  assert.equal(matches('src/platform/core/modules/index.ts', 'src/platform/core/**'), true);
});
test('transitive imports supplement declared dependencies for shared helper changes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-import-plan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'src/platform/node/lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/platform/node/lib/setup.test.js'), "import './middle.js';");
  fs.writeFileSync(path.join(root, 'src/platform/node/lib/middle.js'), "export {value} from './shared.js';");
  fs.writeFileSync(path.join(root, 'src/platform/node/lib/shared.js'), 'export const value=1;');
  const groups = { groups: { setup: { tests: ['src/platform/node/lib/setup.test.js'], dependencies: [] } } };
  const imports = importedDependencies(groups, root);
  assert.ok(imports.setup.has('src/platform/node/lib/shared.js'));
  assert.deepEqual(
    selectTests(['src/platform/node/lib/shared.js'], groups, ['src/platform/node/lib/setup.test.js'], { imports })
      .groups,
    ['setup'],
  );
});
test('Git comparison includes both sides of cross-area renames and selected failures propagate', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-test-plan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim();
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  git('init', '-q');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.test');
  write('src/prototypes/pat/example/main.tsx', 'original\n');
  write(
    'src/platform/node/check/test-groups.json',
    JSON.stringify({
      version: 1,
      groups: { runtime: { tests: ['src/platform/node/lib/failure.test.js'], dependencies: ['src/platform/**'] } },
    }),
  );
  write(
    'src/platform/node/lib/failure.test.js',
    "import {test} from 'node:test'; test('failure propagates',()=>{throw new Error('deliberate fixture failure')});\n",
  );
  git('add', '.');
  git('commit', '-qm', 'before');
  const before = git('rev-parse', 'HEAD');
  fs.mkdirSync(path.join(root, 'src/platform/app'), { recursive: true });
  fs.renameSync(path.join(root, 'src/prototypes/pat/example/main.tsx'), path.join(root, 'src/platform/app/main.tsx'));
  git('add', '.');
  git('commit', '-qm', 'after');
  const paths = changedPaths(before, 'HEAD', { root });
  assert.ok(paths.includes('src/prototypes/pat/example/main.tsx'));
  assert.ok(paths.includes('src/platform/app/main.tsx'));
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    [path.resolve('src/platform/node/check/test.js'), '--changed', before, 'HEAD'],
    {
      cwd: root,
      encoding: 'utf8',
      env,
    },
  );
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /deliberate fixture failure/);
  write('src/platform/app/new.tsx', 'uncommitted work');
  assert.ok(changedPaths(before, 'HEAD', { root }).includes('src/platform/app/new.tsx'));
  fs.unlinkSync(path.join(root, 'src/platform/app/new.tsx'));
  const authoringBase = git('rev-parse', 'HEAD');
  write('src/prototypes/pat/example/main.tsx', 'authored screen');
  git('add', '.');
  git('commit', '-qm', 'authoring');
  const output = path.join(os.tmpdir(), `studio-plan-output-${path.basename(root)}`);
  const summary = output + '-summary';
  t.after(() => {
    fs.rmSync(output, { force: true });
    fs.rmSync(summary, { force: true });
  });
  const planned = spawnSync(
    process.execPath,
    [path.resolve('src/platform/node/check/test.js'), '--changed', authoringBase, 'HEAD', '--plan-only'],
    { cwd: root, encoding: 'utf8', env: { ...env, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary } },
  );
  assert.equal(planned.status, 0, planned.stderr);
  assert.deepEqual(JSON.parse(planned.stdout).groups, []);
  assert.match(fs.readFileSync(output, 'utf8'), /tests_needed=false/);
  assert.match(fs.readFileSync(summary, 'utf8'), /Authoring: production checks only/);
  const forced = spawnSync(
    process.execPath,
    [path.resolve('src/platform/node/check/test.js'), '--changed', authoringBase, 'HEAD', '--plan-only', '--full'],
    { cwd: root, encoding: 'utf8', env },
  );
  assert.equal(forced.status, 0, forced.stderr);
  assert.equal(JSON.parse(forced.stdout).full, true);
});
