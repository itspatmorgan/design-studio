import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { computeContract, contractProblems, exportNames, readSnapshot, serialize, typeFields } from './contract.js';

const base = () => structuredClone(computeContract());
const source = code => ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true);

// Upstream regression: the committed snapshot matches the source. A studio's own build does not run this,
// so a team that edits platform code is not asked to change the platform version.
test('the committed snapshot matches the platform source', () => {
  assert.deepEqual(contractProblems(computeContract(), readSnapshot()), []);
});

test('an unchanged contract passes', () => {
  assert.deepEqual(contractProblems(base(), base()), []);
});

test('a change without a version bump fails and says what to do', () => {
  const now = base(),
    snapshot = base();
  now.moduleEntries.push('src/platform/app/fake/Thing');
  now.types.ModuleSpec = now.types.ModuleSpec.filter(f => f !== 'lib');
  const [problem, ...rest] = contractProblems(now, snapshot);
  assert.equal(rest.length, 0);
  assert.match(problem, /without a PLATFORM_VERSION change/);
  assert.match(problem, /moduleEntries: added src\/platform\/app\/fake\/Thing/);
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

test('a missing snapshot asks for an update', () => {
  assert.match(contractProblems(base(), null)[0], /pnpm contract --update/);
});

test('type fields keep optionality and exports split values from types', () => {
  assert.deepEqual(typeFields(source('type T = { a: string; b?: number; c(): void }'), 'T'), ['a', 'b?', 'c']);
  assert.deepEqual(
    exportNames(
      source(
        "export type { A } from './a'; export { B, type C } from './b'; export const D = 1, E = 2; export function f() {} export * from './z'",
      ),
    ),
    { values: ['* from ./z', 'B', 'D', 'E', 'f'], types: ['A', 'C'] },
  );
  assert.throws(() => typeFields(source('type U = string'), 'U'));
});

test('the snapshot serializes with a trailing newline', () => {
  assert.ok(serialize({ a: 1 }).endsWith('}\n'));
});
