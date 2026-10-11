import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import {
  apiExports,
  apiProblems,
  computeContract,
  contractChanges,
  contractProblems,
  readSnapshot,
  serialize,
} from './contract.js';
import { API_ENTRIES } from '../../core/modules/boundaries.ts';

const current = computeContract();
const base = () => structuredClone(current);
const source = code => ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true);

test('the committed snapshot matches the semantic public surface', () => {
  assert.deepEqual(contractProblems(current, readSnapshot(), apiProblems()), []);
  assert.match(current.api['#studio/module'].ModuleBuild.signature, /Data = unknown/);
  assert.match(current.api['#studio/data'].CONFIG.signature, /readonly modules/);
  assert.match(current.types.ModuleSpec.signature, /requires: string/);
  assert.match(current.types.ModuleApp.signature, /landing\?/);
  assert.deepEqual(current.runtimeRequirements, {
    node: '>=24 <25',
    pnpm: '>=12 <13',
    react: '^19.3.0',
    reactDom: '^19.3.0',
  });
});

test('stale signatures and requirements need a snapshot update, without a pre-release version mandate', () => {
  for (const change of [
    now => {
      now.types.ModuleSpec.signature = now.types.ModuleSpec.signature.replace('requires: string', 'requires: number');
    },
    now => {
      now.api['#studio/module'].ModuleServer.signature = '() => void';
    },
    now => {
      now.runtimeRequirements.node = '>=25';
    },
    now => {
      delete now.api['#studio/data'].APP_NAME;
    },
    now => {
      now.platformVersion = '0.4.0';
    },
  ]) {
    const now = base();
    change(now);
    const [problem] = contractProblems(now, base());
    assert.match(problem, /snapshot is stale/);
    assert.match(problem, /pnpm contract --update/);
    assert.doesNotMatch(problem, /Bump PLATFORM_VERSION/);
    assert.deepEqual(contractProblems(now, now), []);
  }
});

test('stable removals and demotions stay stable; experimental changes remain visible', () => {
  const changed = base();
  changed.api['#studio/ui'].Extra = { stability: 'experimental', signature: 'string' };
  delete changed.api['#studio/ui'].Prose;
  assert.equal(contractChanges(changed, base()).stable.length, 0);
  assert.equal(contractChanges(changed, base()).experimental.length, 2);
  changed.api['#studio/data'].APP_NAME.stability = 'experimental';
  assert.ok(contractChanges(changed, base()).stable.some(line => line.includes('APP_NAME')));
});

test('every API export names its stability and description', () => {
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
  assert.match(contractProblems(base(), base(), problems)[0], /d needs/);
});

test('missing and superseded snapshots fail clearly without a legacy reader', () => {
  assert.match(contractProblems(base(), null)[0], /pnpm contract --update/);
  assert.match(contractProblems(base(), { platformVersion: '0.2.1' })[0], /unsupported schema/);
  assert.ok(serialize({ a: 1 }).endsWith('}\n'));
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-contract-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  };
  write(
    'package.json',
    JSON.stringify({
      engines: { node: '>=24 <25', pnpm: '>=12 <13' },
      dependencies: { react: '^19.3.0', 'react-dom': '^19.3.0' },
    }),
  );
  write(
    'tsconfig.app.json',
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'ES2023',
        module: 'esnext',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        noEmit: true,
      },
      include: ['src'],
    }),
  );
  write('src/platform/core/modules/index.ts', "export const PLATFORM_VERSION = '0.3.0';");
  write(
    'src/platform/core/formats.ts',
    'export const FORMAT_VERSIONS = {config:1,prototype:1,contributor:1} as const;',
  );
  for (const entry of API_ENTRIES) write(`src/platform/api/${entry}.ts`, 'export {};');
  const api = `import type {Nested} from '../core/nested.ts';
    /** @stable A fixture shape. */ export type Shape<T = string> = {readonly nested: Nested; optional?: T; run(value: T): number};
    /** @stable A fixture callable. */ export function call(input: Shape): number { return input.run('value'); }`;
  write('src/platform/api/module.ts', api);
  write('src/platform/core/nested.ts', 'export type Nested = {value: boolean | null};');
  return { root, write, api };
}

test('source checks detect property types, nested unions, readonly, optionality, signatures and generic defaults', t => {
  const f = fixture(t);
  const before = computeContract(f.root);
  for (const [from, to] of [
    ['readonly nested', 'nested'],
    ['optional?: T', 'optional: T'],
    ['run(value: T): number', 'run(value: number): string'],
    ['T = string', 'T = number'],
  ]) {
    f.write('src/platform/api/module.ts', f.api.replace(from, to));
    assert.ok(contractChanges(computeContract(f.root), before).stable.length, `${from} -> ${to}`);
  }
  f.write('src/platform/api/module.ts', f.api);
  f.write('src/platform/core/nested.ts', 'export type Nested = {value: string | null};');
  const changed = computeContract(f.root);
  assert.equal(changed.api['#studio/module'].Shape.signature, before.api['#studio/module'].Shape.signature);
  assert.ok(contractChanges(changed, before).stable.some(line => line.includes('Nested')));
});

test('formatting, comments, implementation bodies and type-file moves preserve the contract', t => {
  const f = fixture(t);
  const before = computeContract(f.root);
  f.write(
    'src/platform/api/module.ts',
    f.api
      .replace('return input.run', '/* implementation */ void input; return input.run')
      .replace('readonly nested: Nested;', 'readonly   nested : Nested ;'),
  );
  assert.deepEqual(computeContract(f.root), before);
  fs.renameSync(path.join(f.root, 'src/platform/core/nested.ts'), path.join(f.root, 'src/platform/core/renamed.ts'));
  f.write('src/platform/api/module.ts', f.api.replace('nested.ts', 'renamed.ts'));
  assert.deepEqual(computeContract(f.root), before);
});

test('class constructors and public fields are semantic; experimental referenced shapes keep their policy', t => {
  const f = fixture(t);
  const code =
    f.api +
    `
/** @experimental A fixture class. */ export class Failure {readonly code: number; constructor(code: number) {this.code = code;} }
/** @experimental Optional data. */ export type Data = {status: boolean};
/** @stable A stable interface referencing optional data. */ export type Reader = {data: Data};`;
  f.write('src/platform/api/module.ts', code);
  const before = computeContract(f.root);
  f.write(
    'src/platform/api/module.ts',
    code
      .replace('constructor(code: number)', 'constructor(code: number, reason: string)')
      .replace('this.code = code;', 'void reason; this.code = code;')
      .replace('status: boolean', 'status: string'),
  );
  const now = computeContract(f.root);
  const changes = contractChanges(now, before);
  assert.equal(changes.stable.length, 0);
  assert.ok(changes.experimental.some(line => line.includes('Failure')));
  assert.ok(changes.experimental.some(line => line.includes('Data')));
  f.write(
    'src/platform/api/module.ts',
    code.replace('readonly code: number;', 'static readonly status = true; readonly code: number;'),
  );
  assert.ok(contractChanges(computeContract(f.root), before).experimental.some(line => line.includes('Failure')));
});

test('interfaces and inferred return references retain semantic shapes across private file moves', t => {
  const f = fixture(t);
  const code = `import type {Nested} from '../core/nested.ts';
/** @stable A callable interface. */ export interface Reader<T = 'value'> {readonly data: Nested; optional?: T; (input: T): number; readonly [key: number]: Nested;}
/** @stable An inferred reference. */ export const inferred = () => ({data: null as Nested | null});`;
  f.write('src/platform/api/module.ts', code);
  const before = computeContract(f.root);
  assert.match(before.api['#studio/module'].Reader.signature, /readonly/);
  fs.renameSync(path.join(f.root, 'src/platform/core/nested.ts'), path.join(f.root, 'src/platform/core/renamed.ts'));
  f.write('src/platform/api/module.ts', code.replace('nested.ts', 'renamed.ts').replace("T = 'value'", 'T = "value"'));
  assert.deepEqual(computeContract(f.root), before);
  f.write('src/platform/core/renamed.ts', 'export type Nested = {value: number | null};');
  const changes = contractChanges(computeContract(f.root), before);
  assert.ok(changes.stable.some(line => line.includes('Nested')));
});
