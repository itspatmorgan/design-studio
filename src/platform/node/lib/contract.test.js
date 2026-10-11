import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {
  apiExports,
  apiProblems,
  computeContract,
  contractProblems,
  readSnapshot,
  serialize,
  typeFields,
} from './contract.js';

const base = () => structuredClone(computeContract());
const source = code => ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true);

// Upstream regression: the committed snapshot matches the source. A studio's own build does not run this,
// so a team that edits platform code is not asked to change the platform version.
test('the committed snapshot matches the platform source', () => {
  assert.deepEqual(contractProblems(computeContract(), readSnapshot(), apiProblems()), []);
});

test('an unchanged contract passes', () => {
  assert.deepEqual(contractProblems(base(), base()), []);
});

test('a change without a version bump fails and says what to do', () => {
  const now = base(),
    snapshot = base();
  now.api['#studio/module'].Thing = 'stable';
  now.types.ModuleSpec = now.types.ModuleSpec.filter(f => f !== 'lib');
  const [problem, ...rest] = contractProblems(now, snapshot);
  assert.equal(rest.length, 0);
  assert.match(problem, /without a PLATFORM_VERSION change/);
  assert.match(problem, /api\.#studio\/module\.Thing: absent -> stable/);
  assert.match(problem, /types\.ModuleSpec: removed lib/);
  assert.match(problem, /Bump PLATFORM_VERSION.*pnpm contract --update/s);
});

test('a change with a version bump asks for a snapshot update', () => {
  const now = base(),
    snapshot = base();
  now.platformVersion = '9.9.9';
  now.runtimePackages.system.push('extra');
  const [problem] = contractProblems(now, snapshot);
  assert.match(problem, /snapshot is stale/);
  assert.match(problem, /system: added extra/);
  assert.match(problem, /pnpm contract --update/);
  assert.match(contractProblems({ ...base(), platformVersion: '9.9.9' }, base())[0], /stale/);
});

test('experimental exports may change without a version bump, but the snapshot records them', () => {
  const now = base(),
    snapshot = base();
  now.api['#studio/ui'].Extra = 'experimental';
  delete now.api['#studio/ui'].Prose;
  const [problem, ...rest] = contractProblems(now, snapshot);
  assert.equal(rest.length, 0);
  assert.doesNotMatch(problem, /Bump PLATFORM_VERSION/);
  assert.match(problem, /api\.#studio\/ui\.Extra: absent -> experimental/);
  assert.match(problem, /api\.#studio\/ui\.Prose: experimental -> absent/);
  assert.match(problem, /pnpm contract --update/);
  // Removing or demoting a stable export is a contract change.
  const demoted = base();
  demoted.api['#studio/data'].APP_NAME = 'experimental';
  assert.match(contractProblems(demoted, base())[0], /Bump PLATFORM_VERSION/);
});

test('every API export carries a stability tag', () => {
  assert.deepEqual(apiProblems(), []);
  const { names, problems } = apiExports(
    source(
      [
        "/** @stable The thing. */ export type { A } from './a';",
        "/** @experimental Helpers. */ export { b, c } from './b';",
        "export { d } from './d';",
        '/** @stable */ export const e = 1;',
        "export * from './z';",
      ].join('\n'),
    ),
  );
  assert.deepEqual(names, { A: 'stable', b: 'experimental', c: 'experimental', d: null, e: null });
  assert.equal(problems.length, 3);
  assert.match(problems[0], /d needs a .*@stable/);
  assert.match(problems[1], /e needs/);
  assert.match(problems[2], /export \* from/);
  assert.match(contractProblems(base(), base(), problems)[0], /d needs/);
});

test('a missing snapshot asks for an update', () => {
  assert.match(contractProblems(base(), null)[0], /pnpm contract --update/);
});

test('type fields keep optionality', () => {
  assert.deepEqual(typeFields(source('type T = { a: string; b?: number; c(): void }'), 'T'), ['a', 'b?', 'c']);
  assert.throws(() => typeFields(source('type U = string'), 'U'));
});

test('the snapshot serializes with a trailing newline', () => {
  assert.ok(serialize({ a: 1 }).endsWith('}\n'));
});
