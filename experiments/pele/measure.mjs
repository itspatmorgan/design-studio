import { chromium } from 'playwright';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const out = path.join(root, 'results');
await mkdir(path.join(out, 'screenshots'), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 2048, height: 1000 }, deviceScaleFactor: 1 });
const watchdog = setTimeout(
  () => {
    void browser.close();
  },
  12 * 60 * 1000,
);
const blocked = [];
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1' || url.protocol === 'data:') return route.continue();
  blocked.push(url.href);
  return route.abort();
});
async function pageReady() {
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto('http://127.0.0.1:4167/?automated', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.evaluation);
  return page;
}
const environment = {
  node: process.version,
  browser: browser.version(),
  platform: process.platform,
  arch: process.arch,
  studio: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  mermaid: '11.17.2',
  pele: '1.8.0',
  date: new Date().toISOString(),
};
const cold = {};
for (const engine of ['mermaid', 'pele', 'pele-lazy']) {
  const p = await pageReady();
  cold[engine] = await p.evaluate(async engine => {
    const start = performance.now();
    const importMs = await window.evaluation.load(engine);
    await document.fonts.ready;
    const target = document.createElement('div');
    target.style.width = '768px';
    document.body.append(target);
    const render = await window.evaluation.renderOne(engine, window.evaluation.fixtures[0].source, target);
    return {
      importMs,
      ...render,
      totalMs: performance.now() - start,
      resources: performance
        .getEntriesByType('resource')
        .filter(r => /\.js/.test(r.name))
        .map(r => ({ name: r.name.split('/').pop(), transferSize: r.transferSize, duration: r.duration })),
    };
  }, engine);
  await p.close();
}
const page = await pageReady();
const fixtures = await page.evaluate(() =>
  window.evaluation.fixtures.map(({ source, ...f }) => ({ ...f, characters: source.length })),
);
await page.evaluate(() => {
  window.longTasks = [];
  new PerformanceObserver(list =>
    window.longTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration }))),
  ).observe({ type: 'longtask', buffered: true });
});
const results = [];
for (let index = 0; index < fixtures.length; index++) {
  const f = fixtures[index];
  const modes =
    f.group === 'policy'
      ? [['light', 'document']]
      : ['light', 'dark'].flatMap(palette =>
          ['document', 'narrow', 'full', 'compact'].map(surface => [palette, surface]),
        );
  for (const [palette, surface] of modes) {
    console.log(`${index + 1}/${fixtures.length} ${f.name} ${palette} ${surface}`);
    const start = Date.now();
    const result = await page.evaluate(
      async args => window.evaluation.compare(...args),
      [index, palette, surface, false, palette === 'light' && surface === 'document' && f.group === 'corpus' ? 8 : 1],
    );
    result.wallMs = Date.now() - start;
    if (palette === 'light' && surface === 'document') result.accessibility = await page.locator('main').ariaSnapshot();
    if (f.group !== 'policy') {
      const file = `${String(index).padStart(2, '0')}-${palette}-${surface}.jpg`;
      await page
        .locator('main')
        .screenshot({ path: path.join(out, 'screenshots', file), timeout: 30000, type: 'jpeg', quality: 85 });
      result.screenshot = `screenshots/${file}`;
    }
    results.push(result);
    // Save incremental evidence in case a stress fixture stalls the browser.
    await writeFile(
      path.join(out, 'results.json'),
      JSON.stringify({ environment, cold, fixtures, results, blocked }, null, 2),
    );
  }
}
const auto = [];
for (const index of [0, 13, 15]) {
  for (const enabled of [false, true]) {
    const result = await page.evaluate(
      args => window.evaluation.compare(...args),
      [index, 'light', 'narrow', enabled, 1],
    );
    await page
      .locator('main')
      .screenshot({ path: path.join(out, 'screenshots', `auto-${index}-${enabled}.jpg`), type: 'jpeg', quality: 85 });
    auto.push(result);
  }
}
const probes = await page.evaluate(async () => {
  const { renderOne, fixtures, load, frame } = window.evaluation;
  const host = document.createElement('div');
  host.style.width = '768px';
  document.body.append(host);
  const target = document.createElement('div');
  host.append(target);
  const first = await renderOne('pele', fixtures[0].source, target);
  const hidden = (host.style.display = 'none');
  const hiddenResult = await renderOne('pele', fixtures[0].source, target);
  host.style.display = '';
  await frame();
  const visible = target.querySelector('svg').getBoundingClientRect().toJSON();
  host.style.width = '280px';
  await frame();
  const resized = target.querySelector('svg').getBoundingClientRect().toJSON();
  const old = target.innerHTML;
  const before = performance.now();
  document.documentElement.classList.toggle('dark');
  target.style.setProperty('--pele-fg', getComputedStyle(document.documentElement).getPropertyValue('--foreground'));
  target.style.setProperty('--pele-bg', getComputedStyle(document.documentElement).getPropertyValue('--card'));
  target.getBoundingClientRect();
  await frame();
  const theme = { unchangedSVG: old === target.innerHTML, elapsedMs: performance.now() - before };
  const invalid = await renderOne('pele', 'flowchart LR\nA[unfinished', target);
  const cleared = !target.querySelector('svg');
  const recovered = await renderOne('pele', fixtures[0].source, target);
  const hosts = Array.from({ length: 8 }, () => {
    const el = document.createElement('div');
    host.append(el);
    return el;
  });
  for (const el of hosts) await renderOne('pele', fixtures[0].source, el);
  const ids = [...host.querySelectorAll('[id]')].map(n => n.id);
  const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  const outputLimit = window.evaluation.outputLimitProbe();
  return {
    font: getComputedStyle(host).fontFamily,
    fontLoaded: document.fonts.check('14px "Geist Variable"'),
    first,
    hiddenResult,
    visible,
    resized,
    theme,
    invalid,
    cleared,
    recovered,
    duplicateIds,
    outputLimit,
  };
});
const accessibility = await page.locator('main').ariaSnapshot();
const longTasks = await page.evaluate(() => window.longTasks);
const bytes = [];
for (const file of await readdir(path.join(root, 'dist/assets'))) {
  if (!file.endsWith('.js')) continue;
  const data = await readFile(path.join(root, 'dist/assets', file));
  bytes.push({ file, raw: data.length, gzip: gzipSync(data).length, brotli: brotliCompressSync(data).length });
}
await writeFile(
  path.join(out, 'results.json'),
  JSON.stringify(
    { environment, cold, fixtures, results, auto, probes, accessibility, longTasks, blocked, bytes },
    null,
    2,
  ),
);
clearTimeout(watchdog);
await browser.close();
console.log(`Results: ${out}`);
