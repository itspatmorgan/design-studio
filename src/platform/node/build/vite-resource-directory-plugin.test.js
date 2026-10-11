import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';
import resourceDirectoryPlugin, {
  directoryModuleSource,
  RESOURCE_DIRECTORY_MODULE,
} from './vite-resource-directory-plugin.js';

test('generated browser directory exposes only identity-to-location maps and remains immutable', async () => {
  const source = directoryModuleSource({
    contributorIds: { pat: '0123456789abcdef' },
    contributorKeys: { '0123456789abcdef': 'pat' },
    systemIds: { product: 'abcdefghjkmnpqrs' },
    systemKeys: { abcdefghjkmnpqrs: 'product' },
    email: 'private@example.com',
    welcomeDismissed: true,
  });
  assert.ok(!source.includes('private@example.com') && !source.includes('welcomeDismissed'));
  const { default: directory } = await import('data:text/javascript,' + encodeURIComponent(source));
  assert.deepEqual(Object.keys(directory), ['contributorIds', 'contributorKeys', 'systemIds', 'systemKeys']);
  assert.equal(directory.systemKeys.abcdefghjkmnpqrs, 'product');
  assert.ok(Object.isFrozen(directory) && Object.values(directory).every(Object.isFrozen));
});

test('virtual directory refreshes identity mappings, rejects duplicates, and removes watcher listeners on close', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-directory-plugin-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'contributors'));
  fs.mkdirSync(path.join(root, 'src/systems/product'), { recursive: true });
  const person = path.join(root, 'contributors/pat.json'),
    system = path.join(root, 'src/systems/product/system.ts');
  fs.writeFileSync(
    person,
    JSON.stringify({
      formatVersion: 1,
      studioId: '0123456789abcdef',
      name: 'Pat',
      email: 'private@example.com',
      github: '',
    }),
  );
  fs.writeFileSync(system, "export default { studioId: 'abcdefghjkmnpqrs' };");
  const plugin = resourceDirectoryPlugin(root),
    id = plugin.resolveId(RESOURCE_DIRECTORY_MODULE);
  assert.equal(plugin.resolveId('other'), null);
  assert.equal(plugin.load('other'), null);
  assert.ok(plugin.load(id).includes('abcdefghjkmnpqrs'));
  assert.ok(!plugin.load(id).includes('private@example.com'));
  const watcher = new EventEmitter();
  watcher.add = () => {};
  const httpServer = new EventEmitter();
  const messages = [],
    invalidated = [],
    module = { id };
  plugin.configureServer({
    watcher,
    httpServer,
    ws: { send: message => messages.push(message) },
    environments: {
      client: {
        moduleGraph: {
          getModuleById: candidate => (candidate === id ? module : null),
          invalidateModule: value => invalidated.push(value),
        },
      },
    },
  });
  watcher.emit('change', path.join(root, 'src/prototypes/pat/example/main.tsx'));
  assert.equal(messages.length, 0);
  fs.writeFileSync(path.join(root, '.studio-system-operation'), '');
  watcher.emit('change', person);
  assert.equal(messages.length, 0);
  assert.equal(invalidated.length, 0);
  fs.unlinkSync(path.join(root, '.studio-system-operation'));
  fs.writeFileSync(system, "export default { studioId: '23456789abcdefgh' };");
  watcher.emit('change', system);
  assert.deepEqual(invalidated, [module]);
  assert.deepEqual(messages, []);
  assert.ok(plugin.load(id).includes('23456789abcdefgh'));
  fs.writeFileSync(system, "export default { studioId: '0123456789abcdef' };");
  assert.throws(() => plugin.load(id), /already declared/);
  httpServer.emit('close');
  assert.equal(watcher.listenerCount('change'), 0);
});

test('Vite resolves the generated directory without importing contributor profiles into its module graph', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-directory-vite-'));
  fs.mkdirSync(path.join(root, 'contributors'));
  fs.mkdirSync(path.join(root, 'src/systems/product'), { recursive: true });
  const person = path.join(root, 'contributors/pat.json');
  fs.writeFileSync(
    person,
    JSON.stringify({
      formatVersion: 1,
      studioId: '0123456789abcdef',
      name: 'Private Name',
      email: 'private@example.com',
      github: '',
      welcomeDismissed: true,
    }),
  );
  fs.writeFileSync(
    path.join(root, 'src/systems/product/system.ts'),
    "export default { studioId: 'abcdefghjkmnpqrs' };",
  );
  const server = await createServer({
    root,
    configFile: false,
    plugins: [resourceDirectoryPlugin(root)],
    server: { middlewareMode: true, ws: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  });
  t.after(async () => {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const result = await server.transformRequest(RESOURCE_DIRECTORY_MODULE);
  assert.ok(result.code.includes('0123456789abcdef'));
  for (const privateData of ['Private Name', 'private@example.com', 'welcomeDismissed'])
    assert.ok(!result.code.includes(privateData));
  assert.equal(server.environments.client.moduleGraph.getModulesByFile(person), undefined);
  const module = server.environments.client.moduleGraph.getModuleById('\0' + RESOURCE_DIRECTORY_MODULE);
  assert.ok(module);
  const messages = [];
  t.mock.method(server.ws, 'send', message => messages.push(message));
  server.watcher.emit('change', person);
  assert.ok(module.transformResult);
  assert.equal(messages.length, 0);
  fs.renameSync(person, path.join(root, 'contributors/morgan.json'));
  server.watcher.emit('unlink', person);
  assert.equal(module.transformResult, null);
  assert.ok(messages.some(message => message.type === 'full-reload'));
});
