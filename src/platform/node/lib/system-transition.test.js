import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';

function transition(baseUrl = '/') {
  const values = new Map(),
    events = [],
    urls = [];
  const context = vm.createContext({
    sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) },
    document: { querySelector: () => ({}), documentElement: {} },
    getComputedStyle: () => ({ getPropertyValue: () => '', fontFamily: 'sans-serif' }),
    window: { dispatchEvent: event => events.push(event), history: { replaceState: (_, __, url) => urls.push(url) } },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
  });
  const source = fs
    .readFileSync('src/platform/modules/systems/pages/creationTransition.ts', 'utf8')
    .replace(/export /g, '')
    .replaceAll('import.meta.env.BASE_URL', JSON.stringify(baseUrl));
  vm.runInContext(stripTypeScriptTypes(source), context);
  return { context, events, urls, values };
}

test('deletion redirects before teardown and waits for both refreshed inventories', () => {
  const { context, events, urls, values } = transition();
  vm.runInContext("beginSystemDeletion('Example', 'example')", context);
  assert.deepEqual(urls, ['/systems']);
  assert.equal(JSON.parse(values.get('studio:creating-system')).operation, 'delete');
  vm.runInContext('finishSystemDeletion({example:{}}, {})', context);
  vm.runInContext('finishSystemDeletion({}, {example:{}})', context);
  assert.equal(events.length, 1);
  vm.runInContext('finishSystemDeletion({}, {})', context);
  assert.equal(events.at(-1).type, 'studio:system-created');
});

test('index completion does not dismiss an in-progress creation', () => {
  const { context, events, urls } = transition();
  vm.runInContext(
    "beginSystemCreation('Example'); finishSystemDeletion({}, {}); openCreatedSystem('example')",
    context,
  );
  assert.equal(events.length, 2);
  assert.deepEqual(urls, ['/systems/example']);
  vm.runInContext('finishSystemCreation()', context);
  assert.equal(events.at(-1).type, 'studio:system-created');
});

test('creation and deletion keep the deployment base path in their permanent destination', () => {
  const { context, urls } = transition('/studio/');
  vm.runInContext(
    "beginSystemCreation('Example'); openCreatedSystem('0123456789abcdef'); beginSystemDeletion('Example', 'example')",
    context,
  );
  assert.deepEqual(urls, ['/studio/systems/0123456789abcdef', '/studio/systems']);
});
