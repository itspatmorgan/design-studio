import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { API_ENTRIES, API_POLICY } from '../../core/modules/boundaries.ts';
import { scopePolicy } from './scope.js';
import importGuard from '../build/vite-import-guard-plugin.js';
import { dependencyResolver, importsOf } from './imports.js';
import { fileTypeDeclarationProblems } from './file-type-declarations.js';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-api-environments-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, code) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, code);
    return target;
  };
  write('package.json', JSON.stringify({ type: 'module', imports: { '#studio/*': './src/platform/api/*.ts' } }));
  write(
    'tsconfig.app.json',
    JSON.stringify({
      compilerOptions: {
        moduleResolution: 'bundler',
        paths: {
          '@/*': ['./src/*'],
          '#studio/*': ['./src/platform/api/*.ts'],
        },
      },
    }),
  );
  for (const entry of API_ENTRIES) write(`src/platform/api/${entry}.ts`, 'export const value = 1;');
  const options = { root, systems: {}, modules: [{ id: 'probe', lib: true, optional: false }] };
  return { root, write, options, policy: scopePolicy(options) };
}

test('Node-safe public entries load and perform representative work in a fresh Node process', () => {
  const entries = API_ENTRIES.filter(entry => API_POLICY[entry].includes('node'));
  const code = `
    import assert from 'node:assert/strict';
    const entries = ${JSON.stringify(entries)};
    for (const entry of entries) await import('#studio/' + entry);
    const { defineFileType, markdownFileType } = await import('#studio/files');
    assert.equal(defineFileType(markdownFileType).label, 'Document');
    const { digestText, initialLifecycle } = await import('#studio/lifecycle');
    assert.equal((await digestText('evidence')).length, 64);
    assert.ok(initialLifecycle);
    const { markdownReferences } = await import('#studio/references');
    assert.equal(typeof markdownReferences, 'function');
    console.log(entries.join(','));
  `;
  assert.equal(
    execFileSync(process.execPath, ['--input-type=module', '--eval', code], {
      cwd: path.resolve(import.meta.dirname, '../../../..'),
      encoding: 'utf8',
    }).trim(),
    entries.join(','),
  );
});

test('Node consumers reject application APIs through re-exports and literal dynamic imports', t => {
  const { write, policy } = fixture(t);
  const server = write('src/modules/probe/server.ts', "import './helper';");
  for (const code of ["export { value } from '#studio/ui';", "void import('#studio/data');"]) {
    write('src/modules/probe/helper.ts', code);
    const problems = policy.apiProblems(server);
    assert.equal(problems.length, 1, problems.join('\n'));
    assert.match(problems[0], /server\.ts -> .*helper\.ts: #studio\/\w+ cannot execute in node/);
  }
});

test('ordinary helpers inherit Node or application context without being mislabeled by their folder', t => {
  const { root, write, policy } = fixture(t);
  const server = write('src/modules/probe/server.ts', "import './helper';");
  const helper = write('src/modules/probe/helper.ts', "export { value } from '#studio/references';");
  assert.equal(policy.problem('#studio/references', helper, path.join(root, 'src/platform/api/references.ts')), null);
  assert.deepEqual(policy.apiProblems(server), []);
  const app = write('src/modules/probe/app.tsx', "import './helper';");
  assert.match(policy.apiProblems(app).join('\n'), /cannot execute in application/);
  const nested = write('src/modules/probe/feature/type.ts', "export {value} from '#studio/data';");
  assert.deepEqual(policy.apiProblems(nested), []);
  write('src/modules/probe/helper.ts', "export {value} from './feature/type';");
  assert.deepEqual(policy.apiProblems(app), []);
  assert.match(policy.apiProblems(server).join('\n'), /cannot execute in node/);
});

test('public Node graphs reject transitive browser features, JSX, renderers and computed imports', t => {
  const { write, policy } = fixture(t);
  write('src/platform/api/files.ts', "export { value } from '../core/helper.ts';");
  const cases = [
    ['export const value = window.location;', /window requires a browser/],
    ['export const value = {window};', /window requires a browser/],
    ['export const value = globalThis.document;', /globalThis.document requires a browser/],
    ['export const value = document.body;', /document requires a browser/],
    ['export const value = import.meta.env.DEV;', /import\.meta\.env requires a browser/],
    ["export const value = import.meta['env'];", /import\.meta\.env requires a browser/],
    ["export { value } from './browser.tsx';", /browser\.tsx is browser code/],
    ["export { value } from './relay.ts';", /browser\.tsx is browser code/],
    ["import './theme.css'; export const value = 1;", /requires an asset loader/],
    ["import React from 'react'; export const value = React;", /renderer dependency/],
    ['const name = "./other"; export const value = import(name);', /Computed imports/],
  ];
  write('src/platform/core/browser.tsx', 'export const value = <div/>;');
  write('src/platform/core/relay.ts', "export { value } from './browser.tsx';");
  write('src/platform/core/theme.css', 'body {color: red}');
  for (const [code, expected] of cases) {
    write('src/platform/core/helper.ts', code);
    assert.ok(
      policy.apiEntryProblems().some(problem => expected.test(problem)),
      code,
    );
  }
  write(
    'src/platform/core/helper.ts',
    `
    export function value(document: {body: string}) { return document.body; }
    export function other() { const window = {location: 'local'}; return window.location; }
    export function local(globalThis: {document: string}) { return globalThis.document; }
    export type Browser = typeof navigator;
  `,
  );
  assert.deepEqual(policy.apiEntryProblems(), []);
});

test('runtime libraries reject application and Node dependencies; public types remain erased', t => {
  const { root, write, policy } = fixture(t);
  const lib = write('src/modules/probe/lib/index.ts', "export { value } from './relay';");
  for (const [code, expected] of [
    ["export { value } from '#studio/ui';", /cannot execute in runtime/],
    ["export { value } from '#studio/references';", /cannot execute in runtime/],
    ["import fs from 'node:fs'; export const value = fs;", /Node-only/],
  ]) {
    write('src/modules/probe/lib/relay.ts', code);
    assert.ok(policy.apiProblems(lib).some(problem => expected.test(problem)));
  }
  write('src/modules/probe/lib/relay.ts', "export type { Value } from '#studio/ui'; export const value = 1;");
  assert.deepEqual(policy.apiProblems(lib), []);
  assert.equal(policy.problem('#studio/ui', lib, path.join(root, 'src/platform/api/ui.ts'), { typeOnly: true }), null);
  assert.match(
    policy.problem('@/platform/api/ui', lib, path.join(root, 'src/platform/api/ui.ts'), { typeOnly: true }),
    /public API/,
  );
});

test('runtime API access is granted by the inventory for prototypes, systems and module libraries', t => {
  const { root, write, options } = fixture(t);
  const policy = scopePolicy({ ...options, systems: { product: { dir: 'src/systems/product' } } });
  const target = path.join(root, 'src/platform/api/runtime.ts');
  for (const rel of [
    'src/prototypes/sam/probe/main.tsx',
    'src/systems/product/components/button.tsx',
    'src/modules/probe/lib/index.ts',
  ]) {
    const file = write(rel, "export {value} from '#studio/runtime';");
    assert.equal(policy.problem('#studio/runtime', file, target), null, rel);
    assert.deepEqual(policy.apiProblems(file), [], rel);
    assert.match(policy.problem('@/platform/api/runtime', file, target), /public API|runtime boundary/, rel);
  }
  const server = write('src/modules/probe/server.ts', "import '#studio/runtime';");
  assert.match(policy.apiProblems(server).join('\n'), /cannot execute in node/);
  assert.match(policy.packageProblem('cn', path.join(root, 'src/prototypes/sam/probe/main.tsx')), /#studio\/runtime/);
});

test('runtime entry graphs cannot grow dependencies on shell services or Node tooling', t => {
  const { write, policy } = fixture(t);
  for (const [source, file, expected] of [
    ['../app/service.ts', 'src/platform/app/service.ts', /Studio application/],
    ['../node/service.js', 'src/platform/node/service.js', /Node-only/],
  ]) {
    write(file, 'export const value = 1;');
    write('src/platform/api/runtime.ts', `export {value} from '${source}';`);
    assert.ok(policy.apiEntryProblems(['runtime']).some(problem => expected.test(problem)));
  }
});

test('application consumers reject Node APIs behind local helpers and retain permitted browser imports', t => {
  const { write, policy } = fixture(t);
  const app = write('src/modules/probe/app.tsx', "import './helper';");
  write('src/modules/probe/helper.ts', "export { value } from '#studio/references';");
  assert.match(policy.apiProblems(app).join('\n'), /cannot execute in application/);
  write('src/modules/probe/helper.ts', "export { value } from '#studio/data';");
  assert.deepEqual(policy.apiProblems(app), []);
  write('src/modules/probe/helper.ts', "import {readFile} from 'fs'; export const value = readFile;");
  assert.match(policy.apiProblems(app).join('\n'), /Node-only/);
});

test('helpers outside team folders cannot launder private platform imports', t => {
  const { write, policy } = fixture(t);
  const app = write('src/modules/probe/app.tsx', "import '@/helper';");
  write('src/helper.ts', "export { value } from '@/platform/core/private';");
  write('src/platform/core/private.ts', 'export const value = 1;');
  assert.match(policy.apiProblems(app).join('\n'), /public API/);
  write('src/helper.ts', "export { value } from '#studio/files';");
  assert.deepEqual(policy.apiProblems(app), []);
});

test('Vite uses the same policy for direct edges, build startup and edited transitive helpers', async t => {
  const { root, write, policy, options } = fixture(t);
  const guard = importGuard(options);
  const resolve = dependencyResolver(root);
  const context = {
    error(message) {
      throw new Error(message);
    },
    async resolve(source, importer) {
      const id = resolve(source, importer);
      return id ? { id } : null;
    },
  };
  // Invalid package source is deliberately not parsed; repository imports still get checked below.
  assert.equal(
    guard.transform.call(context, "import 'undeclared-package';", path.join(root, 'node_modules/vendor/index.js')),
    null,
  );
  guard.buildStart.call(context);
  const server = write('src/modules/probe/server.ts', "import './helper';");
  write('src/modules/probe/helper.ts', "export { value } from '#studio/files';");
  guard.transform.call(context, fs.readFileSync(server, 'utf8'), server);
  write('src/modules/probe/helper.ts', "export { value } from '#studio/ui';");
  assert.throws(() => guard.transform.call(context, fs.readFileSync(server, 'utf8'), server), /cannot execute in node/);
  const expected = policy.problem('#studio/ui', server, path.join(root, 'src/platform/api/ui.ts'));
  await assert.rejects(guard.resolveId.call(context, '#studio/ui', server, {}), { message: expected });
  write('src/platform/api/files.ts', "export { value } from '../core/hidden.ts';");
  write('src/platform/core/hidden.ts', 'export const value = window.location;');
  assert.throws(() => guard.buildStart.call(context), /window requires a browser/);
});

test('public UI building blocks do not eagerly import the shell or application registry', () => {
  const root = path.resolve(import.meta.dirname, '../../../..'),
    resolve = dependencyResolver(root),
    seen = new Set();
  const visit = file => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const edge of importsOf(fs.readFileSync(file, 'utf8'), file)) {
      if (edge.typeOnly || !edge.source) continue;
      const next = resolve(edge.source, file);
      if (next && next.startsWith(path.join(root, 'src/platform')) && /\.[cm]?[jt]sx?$/.test(next)) visit(next);
    }
  };
  visit(path.join(root, 'src/platform/api/ui.ts'));
  for (const file of ['src/platform/app/shell/App.tsx', 'src/platform/app/modules.ts'])
    assert.equal(seen.has(path.join(root, file)), false, `${file} introduces an eager module registration cycle`);
});

test('file declarations validate their own entry and transitive Node-safe adapters', t => {
  const { root, write } = fixture(t);
  const directory = path.join(root, 'src/modules/probe');
  write('src/modules/probe/type.ts', "export {value as default} from './identity';");
  write('src/modules/probe/identity.ts', "export {value} from '#studio/files';");
  assert.deepEqual(fileTypeDeclarationProblems(root, directory), []);
  write('src/modules/probe/identity.ts', "export {value} from './nested';");
  for (const source of [
    "import React from 'react'; export const value=React;",
    'export const value=window.location;',
    "export {value} from '../../../platform/private';",
  ]) {
    write('src/platform/private.ts', 'export const value=1;');
    write('src/modules/probe/nested.ts', source);
    assert.ok(fileTypeDeclarationProblems(root, directory).length, source);
  }
  write('src/modules/probe/type.ts', "export * from '../../../platform/private';");
  assert.match(fileTypeDeclarationProblems(root, directory).join('\n'), /Node-safe local helpers|public API/);
});
