import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build, createServer } from 'vite';
import ts from 'typescript';
import { scopePolicy } from './scope.js';
import { importsOf } from './imports.js';
import { systemDependencyProblems, systemLibraryInventory, systemPeerProblems } from './system-dependencies.js';
import importGuard from '../build/vite-import-guard-plugin.js';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-system-packages-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value));
  };
  const systems = {
    a: {
      role: 'prototype',
      studioId: '0123456789abcdef',
      dir: 'src/systems/a',
      libraries: [
        {
          kind: 'package',
          id: 'charts',
          label: 'Charts',
          package: 'chart-library',
          description: 'Charts',
          docs: 'https://example.test',
          entry: 'libraries/charts.ts',
        },
      ],
    },
    b: { role: 'prototype', studioId: 'abcdefghjkmnpqrs', dir: 'src/systems/b', libraries: [] },
  };
  write('package.json', { private: true, dependencies: { react: '^19.3.0', 'react-dom': '^19.3.0' } });
  for (const id of ['a', 'b']) {
    write(`src/systems/${id}/package.json`, {
      private: true,
      name: `@studio-system/${id}`,
      type: 'module',
      dependencies: id === 'a' ? { 'chart-library': '1.0.0' } : {},
      peerDependencies: { react: '^19.3.0', 'react-dom': '^19.3.0' },
    });
    write(`src/prototypes/alex/${id}/meta.json`, { title: id, systemId: systems[id].studioId });
  }
  write('src/systems/a/libraries/charts.ts', "export * from 'chart-library';");
  write('src/systems/a/libraries/private.ts', 'export const privateValue = 1;');
  write('src/systems/a/node_modules/chart-library/package.json', {
    name: 'chart-library',
    version: '1.0.0',
    main: 'index.js',
  });
  write('src/systems/a/node_modules/chart-library/index.js', 'exports.version = "one";');
  return {
    root,
    write,
    systems,
    policy: scopePolicy({ root, systems, modules: [] }),
    file: file => path.join(root, file),
  };
}

test('package access follows system ownership, including types, subpaths, reexports and unresolved imports', t => {
  const { root, systems, policy, file } = fixture(t);
  assert.equal(policy.packageProblem('chart-library/subpath', file('src/systems/a/components/chart.ts')), null);
  for (const source of ['chart-library', 'chart-library/subpath', 'missing-package', 'node:fs']) {
    assert.match(policy.packageProblem(source, file('src/systems/b/components/chart.ts')), /not declared/);
    assert.match(policy.packageProblem(source, file('src/prototypes/alex/a/view.ts')), /declared library entry/);
  }
  for (const { source } of importsOf(
    "import type {Chart} from 'chart-library'; export * from 'chart-library'; import('chart-library/subpath'); require('chart-library'); type Chart = import('chart-library').Chart",
  ))
    assert.match(policy.packageProblem(source, file('src/prototypes/alex/a/view.ts')), /Prototype scope/);
  const entry = file('src/systems/a/libraries/charts.ts');
  assert.equal(policy.problem('@/systems/a/libraries/charts', file('src/prototypes/alex/a/view.ts'), entry), null);
  assert.match(
    policy.problem('@/systems/a/libraries/charts', file('src/prototypes/alex/b/view.ts'), entry),
    /outside its runtime boundary/,
  );
  assert.match(
    policy.problem(
      '@/systems/a/libraries/private',
      file('src/prototypes/alex/a/view.ts'),
      file('src/systems/a/libraries/private.ts'),
    ),
    /public library entry/,
  );
  assert.match(
    policy.problem(
      '/node_modules/chart-library',
      file('src/prototypes/alex/a/view.ts'),
      file('node_modules/chart-library/index.js'),
    ),
    /declared name/,
  );
  assert.match(policy.packageProblem('chart-library', file('src/lib/shared.ts')), /belongs in a system/);
  assert.deepEqual(systemDependencyProblems(root, systems), []);
  assert.equal(systemLibraryInventory(root, 'a', systems.a)[0].version, '1.0.0');
  systems.a.libraries.unshift({
    kind: 'source',
    id: 'curated',
    label: 'Curated source',
    description: 'Components',
    docs: 'https://example.test',
  });
  assert.deepEqual(systemDependencyProblems(root, systems), []);
  assert.equal(systemLibraryInventory(root, 'a', systems.a)[0].version, null);
  delete systems.a.libraries[1].entry;
  assert.deepEqual(systemDependencyProblems(root, systems), []);
  assert.match(
    policy.problem('@/systems/a/libraries/charts', file('src/prototypes/alex/a/view.ts'), entry),
    /public library entry/,
  );
  fs.rmSync(file('src/systems/a/node_modules'), { recursive: true });
  assert.match(
    policy.packageProblem('chart-library', file('src/systems/a/components/chart.ts')),
    /declared but not installed/,
  );
});

test('system manifests reject missing ownership, duplicate package identities, and private React copies', t => {
  const { root, write, systems } = fixture(t);
  write('src/systems/b/package.json', {
    private: true,
    name: '@studio-system/a',
    dependencies: { react: '18.0.0' },
    peerDependencies: {},
  });
  const problems = systemDependencyProblems(root, systems).join('\n');
  assert.match(problems, /another system uses/);
  assert.match(problems, /declare it only as a peer/);
  assert.match(problems, /Studio's peer requirement/);
  fs.rmSync(path.join(root, 'src/systems/a/libraries/charts.ts'));
  assert.match(systemDependencyProblems(root, systems).join('\n'), /entry.*missing/);
});

test('system runtime peers reject incompatible libraries and stale installs without auditing host CLI dependencies', t => {
  const { root, write, systems } = fixture(t);
  for (const name of ['react', 'react-dom']) {
    write(`node_modules/${name}/package.json`, { name, version: '19.3.0', main: 'index.js' });
    write(`node_modules/${name}/index.js`, 'module.exports = {};');
  }
  write('node_modules/host-cli/package.json', {
    name: 'host-cli',
    version: '1.0.0',
    peerDependencies: { react: '^18' },
  });
  assert.deepEqual(systemPeerProblems(root, systems), []);
  write('src/systems/a/node_modules/chart-library/package.json', {
    name: 'chart-library',
    version: '1.0.0',
    main: 'index.js',
    dependencies: { 'chart-helper': '1.0.0' },
  });
  write('src/systems/a/node_modules/chart-helper/package.json', {
    name: 'chart-helper',
    version: '1.0.0',
    peerDependencies: { react: '^18' },
  });
  assert.match(systemPeerProblems(root, systems).join('\n'), /chart-helper.*requires react/);
  write('src/systems/a/node_modules/chart-helper/package.json', {
    name: 'chart-helper',
    version: '1.0.0',
    dependencies: { react: '18.0.0' },
  });
  write('src/systems/a/node_modules/chart-helper/node_modules/react/package.json', {
    name: 'react',
    version: '18.0.0',
  });
  assert.match(systemPeerProblems(root, systems).join('\n'), /private react version/);
  write('src/systems/a/node_modules/chart-library/package.json', { name: 'chart-library', version: '2.0.0' });
  assert.match(systemPeerProblems(root, systems).join('\n'), /does not match/);
});

test('two package versions resolve through assigned library entries in TypeScript, Vite development and production', async t => {
  const { root, write, systems } = fixture(t);
  fs.rmSync(path.join(root, 'src/systems/a/node_modules'), { recursive: true });
  write('package.json', { private: true, type: 'module', dependencies: { 'host-only': 'file:vendor/host' } });
  write('pnpm-workspace.yaml', 'packages:\n  - src/systems/*\nhoist: false\nautoInstallPeers: false\n');
  for (const [id, version] of [
    ['a', '1.0.0'],
    ['b', '2.0.0'],
  ]) {
    write(`vendor/${id}/package.json`, {
      name: 'chart-library',
      version,
      type: 'module',
      exports: { '.': { types: './index.d.ts', default: './index.js' } },
    });
    write(`vendor/${id}/index.js`, `export const version = 'chart-version-${version}';`);
    write(`vendor/${id}/index.d.ts`, 'export declare const version: string;');
    write(`src/systems/${id}/package.json`, {
      private: true,
      name: `@studio-system/${id}`,
      type: 'module',
      dependencies: { 'chart-library': `file:../../../vendor/${id}` },
    });
    write(`src/systems/${id}/libraries/charts.ts`, "export * from 'chart-library';");
    write(`src/prototypes/alex/${id}/view.ts`, `export { version } from '../../../systems/${id}/libraries/charts';`);
    systems[id].libraries = systems.a.libraries;
  }
  write('vendor/host/package.json', { name: 'host-only', version: '1.0.0', main: 'index.js' });
  write('vendor/host/index.js', "module.exports = 'host';");
  execFileSync('pnpm', ['install', '--offline', '--ignore-scripts'], { cwd: root, stdio: 'pipe', timeout: 30000 });
  for (const [id, version] of [
    ['a', '1.0.0'],
    ['b', '2.0.0'],
  ]) {
    const require = createRequire(path.join(root, `src/systems/${id}/package.json`));
    assert.equal(require('chart-library').version, `chart-version-${version}`);
    assert.equal(systemLibraryInventory(root, id, systems[id])[0].version, version);
  }
  const roots = ['a', 'b'].map(id => path.join(root, `src/prototypes/alex/${id}/view.ts`));
  const program = ts.createProgram(roots, {
    noEmit: true,
    strict: true,
    types: [],
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  assert.deepEqual(
    ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
    [],
  );
  write('index.html', '<script type="module" src="/main.ts"></script>');
  write(
    'main.ts',
    "import {version as a} from './src/prototypes/alex/a/view'; import {version as b} from './src/prototypes/alex/b/view'; console.log(a,b);",
  );
  const options = {
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [importGuard({ root, systems, modules: [], prototypeDirs: [] })],
  };
  const server = await createServer({
    ...options,
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    assert.match(
      (await server.transformRequest('/src/prototypes/alex/a/view.ts')).code,
      /systems\/a\/libraries\/charts/,
    );
    await server.transformRequest('/src/systems/a/libraries/charts.ts');
    await server.transformRequest('/src/systems/b/libraries/charts.ts');
    write('src/prototypes/alex/a/bad.ts', "import 'host-only';");
    await assert.rejects(server.transformRequest('/src/prototypes/alex/a/bad.ts'), /not shared runtime/);
  } finally {
    await server.close();
  }
  const result = await build({ ...options, build: { write: false, minify: false } });
  const output = result.output
    .filter(item => item.type === 'chunk')
    .map(item => item.code)
    .join('\n');
  assert.match(output, /chart-version-1\.0\.0/);
  assert.match(output, /chart-version-2\.0\.0/);
  write('src/prototypes/alex/a/view.ts', "export * from 'host-only';");
  await assert.rejects(build({ ...options, build: { write: false } }), /not shared runtime/);
});
