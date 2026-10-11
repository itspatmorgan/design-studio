import { test } from 'node:test';
import assert from 'node:assert/strict';
import previewTheme, { installPreviewTheme } from './vite-preview-theme-plugin.js';

function fixture(search, { saved = null, systemDark = false, blockedStorage = false } = {}) {
  const classes = new Set();
  const nodes = [];
  return {
    classes,
    nodes,
    location: { search },
    localStorage: {
      getItem(key) {
        assert.equal(key, 'design-studio:color-mode');
        if (blockedStorage) throw Error('blocked');
        return saved;
      },
    },
    matchMedia(query) {
      assert.equal(query, '(prefers-color-scheme: dark)');
      return { matches: systemDark };
    },
    document: {
      documentElement: {
        classList: {
          toggle(name, enabled) {
            if (enabled) classes.add(name);
            else classes.delete(name);
          },
        },
      },
      createElement: tag => ({ tag }),
      head: { append: (...values) => nodes.push(...values) },
    },
  };
}
const address = dark => '?' + new URLSearchParams({ 'studio-preview': '1', config: JSON.stringify({ dark }) });

test('preview mode is applied before modules or theme tokens exist', () => {
  for (const dark of [true, false]) {
    const win = fixture(address(dark));
    installPreviewTheme(win);
    assert.equal(win.classes.has('dark'), dark);
    assert.equal(win.nodes[0].name, 'color-scheme');
    assert.equal(win.nodes[0].content, dark ? 'dark' : 'light');
    assert.match(win.nodes[1].textContent, /var\(--background, Canvas\)/);
  }
});

test('malformed preview addresses are left to runtime validation', () => {
  for (const search of [
    '?studio-preview=1&config=broken',
    '?studio-preview=1&config=null',
    address('dark'),
    '?studio-preview=1&config=' + 'x'.repeat(8192),
  ]) {
    const win = fixture(search);
    assert.doesNotThrow(() => installPreviewTheme(win));
    assert.equal(win.nodes.length, 0);
    assert.equal(win.classes.size, 0);
  }
});

test('Studio restores its saved mode before React and gives it priority over the system', () => {
  for (const saved of ['dark', 'light']) {
    for (const systemDark of [true, false]) {
      for (const search of ['', '?config={"dark":true}']) {
        const win = fixture(search, { saved, systemDark });
        installPreviewTheme(win);
        assert.equal(win.classes.has('dark'), saved === 'dark');
        assert.equal(win.nodes[0].content, saved);
      }
    }
  }
});

test('Studio follows the system without a saved mode, including when storage is unavailable', () => {
  for (const systemDark of [true, false]) {
    for (const blockedStorage of [true, false]) {
      const win = fixture('', { systemDark, blockedStorage });
      assert.doesNotThrow(() => installPreviewTheme(win));
      assert.equal(win.classes.has('dark'), systemDark);
    }
  }
});

test('preview configuration takes priority over Studio preferences', () => {
  for (const dark of [true, false]) {
    const win = fixture(address(dark), { saved: dark ? 'light' : 'dark', systemDark: !dark, blockedStorage: true });
    installPreviewTheme(win);
    assert.equal(win.classes.has('dark'), dark);
  }
});

test('the same self-contained synchronous head bootstrap is used in dev and production', () => {
  const plugin = previewTheme();
  assert.equal(plugin.apply, undefined);
  const [script] = plugin.transformIndexHtml.handler();
  assert.equal(script.injectTo, 'head-prepend');
  assert.equal(script.attrs?.type, undefined);
  const win = fixture(address(true));
  new Function('window', script.children)(win);
  assert.equal(win.classes.has('dark'), true);
});
