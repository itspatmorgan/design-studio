import { test } from 'node:test';
import assert from 'node:assert/strict';
import recovery, { installDeploymentRecovery } from './vite-deployment-recovery-plugin.js';

function fixture(href = 'https://example.test/studio/prototypes/sam/flow?view=main#details', unavailable = false) {
  const handlers = new Map();
  const values = new Map();
  const replacements = [];
  const root = { hasChildNodes: () => false, textContent: '' };
  const win = {
    navigator: { onLine: true },
    document: { getElementById: () => root },
    location: { href, origin: new URL(href).origin, replace: url => replacements.push(url) },
    sessionStorage: {
      getItem: key => {
        if (unavailable) throw Error('blocked');
        return values.get(key);
      },
      setItem: (key, value) => {
        if (unavailable) throw Error('blocked');
        values.set(key, value);
      },
    },
    addEventListener: (name, handler) => handlers.set(name, handler),
  };
  installDeploymentRecovery(win, '/studio/');
  return { win, handlers, replacements, values, root };
}

test('chunk failures refresh once, preserving the route, search and hash', () => {
  const f = fixture();
  let prevented = 0;
  const event = { preventDefault: () => prevented++ };
  f.handlers.get('vite:preloadError')(event);
  f.handlers.get('vite:preloadError')(event);
  assert.equal(f.replacements.length, 1);
  assert.equal(prevented, 1);
  const url = new URL(f.replacements[0]);
  assert.equal(url.pathname, '/studio/prototypes/sam/flow');
  assert.equal(url.searchParams.get('view'), 'main');
  assert.equal(url.hash, '#details');
  assert.ok(Number(url.searchParams.get('_studio_reload')) > 0);
  const next = fixture(f.replacements[0], true);
  next.handlers.get('vite:preloadError')(event);
  assert.equal(next.replacements.length, 0, 'even blocked storage cannot cause a reload loop');
});

test('entry failures recover before the app loads, while unrelated errors and offline failures do not reload', () => {
  const f = fixture();
  const error = f.handlers.get('error');
  error({ target: { tagName: 'IMG', src: 'https://example.test/studio/assets/image.png' } });
  error({ target: { tagName: 'SCRIPT', type: 'module', src: 'https://other.test/studio/assets/app.js' } });
  error({ target: { tagName: 'SCRIPT', type: 'module', src: 'https://example.test/other/assets/app.js' } });
  assert.equal(f.replacements.length, 0);
  const entry = { target: { tagName: 'SCRIPT', type: 'module', src: 'https://example.test/studio/assets/app.js' } };
  f.win.navigator.onLine = false;
  error(entry);
  assert.equal(f.replacements.length, 0);
  assert.match(f.root.textContent, /Check your connection/);
  f.win.navigator.onLine = true;
  error(entry);
  assert.equal(f.replacements.length, 1);
});

test('session storage also bounds retries when the recovery query was removed', () => {
  const f = fixture();
  f.values.set('studio:deployment-recovery:/studio/', String(Date.now()));
  let prevented = false;
  f.handlers.get('vite:preloadError')({
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(f.replacements.length, 0);
  assert.equal(prevented, false, 'let the app report persistent errors');
});

test('the production bootstrap is self contained and runs before the module script', () => {
  const plugin = recovery();
  assert.equal(plugin.apply, 'build');
  plugin.configResolved({ base: '/studio/' });
  const [script] = plugin.transformIndexHtml.handler();
  assert.equal(script.injectTo, 'head-prepend');
  const f = fixture();
  new Function('window', script.children)(f.win);
  f.handlers.get('vite:preloadError')({ preventDefault() {} });
  assert.equal(f.replacements.length, 1);
});
