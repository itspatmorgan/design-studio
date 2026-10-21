import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, preview } from 'vite';
const root = new URL('../../../../../../', import.meta.url);
const fixtureRoot = fileURLToPath(new URL('.', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('dist/.vite/manifest.json', root), 'utf8'));
const css = manifest['index.html'].css[0];
let fixture, assets, browser, page;
const errors = [];
const cacheDir = await mkdtemp(join(tmpdir(), 'studio-diagram-cache-'));
const address = server => `http://127.0.0.1:${server.httpServer.address().port}`;
const deadline = setTimeout(() => void browser?.close(), 120000);
try {
  assets = await preview({
    configFile: false,
    root: fileURLToPath(root),
    build: { outDir: 'dist' },
    preview: { host: '127.0.0.1', port: 0 },
  });
  fixture = await createServer({
    cacheDir,
    configFile: false,
    root: fixtureRoot,
    resolve: { alias: { '@': fileURLToPath(new URL('src', root)) } },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [fileURLToPath(root)] } },
  });
  await fixture.listen();
  browser = await chromium.launch();
  const assetUrl = address(assets);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let release;
  const gate = new Promise(resolve => {
    release = resolve;
  });
  let heldFonts = 0;
  await context.route('**/*geist*.woff2', async route => {
    heldFonts++;
    await gate;
    await route.continue();
  });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(address(fixture));
  await page.addStyleTag({ url: `${assetUrl}/${css}` });
  await page.addStyleTag({ content: 'body{overflow:auto}figure{flex-shrink:0}#cases{padding:16px}' });
  await page.waitForFunction(() => window.integration);
  await page.evaluate(() => window.integration.mount());
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'preparing');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('figure svg').count(), 0, 'must wait for the delayed webfont');
  assert(heldFonts > 0);
  release();
  const ready = () => page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'ready');
  await ready();
  const snapshot = () =>
    page.locator('figure').evaluate(el => ({
      ...el.dataset,
      width: el.clientWidth,
      viewBox: el.querySelector('svg')?.getAttribute('viewBox'),
      svgBox: el.querySelector('svg')?.getBoundingClientRect().toJSON(),
      font: getComputedStyle(el).fontFamily,
      title: el.querySelector('title')?.textContent,
    }));
  assert.equal(await page.evaluate(() => document.fonts.check('14px "Geist Variable"')), true);
  for (const width of [360, 280, 768]) {
    const before = await snapshot();
    await page.evaluate(width => window.integration.width(width), width);
    await page.waitForFunction(
      commit => Number(document.querySelector('figure')?.dataset.artifactCommit) > commit,
      Number(before.artifactCommit),
    );
    await ready();
    const after = await snapshot();
    assert(after.width <= width);
    assert.notEqual(after.artifactInputRevision, before.artifactInputRevision);
    assert(after.svgBox.width <= width);
  }
  await page.evaluate(() => window.integration.hidden(true));
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'unknown');
  await page.evaluate(() => {
    window.integration.sourceChange('flowchart LR\nA[Revealed] --> B[Current]');
    window.integration.hidden(false);
  });
  await ready();
  assert((await page.locator('figure').textContent()).includes('Revealed'));
  await page.evaluate(() => window.integration.family('LateGeist, monospace'));
  await ready();
  await page.waitForTimeout(100);
  const fallback = await snapshot();
  // Add the face after a fallback diagram was already committed with the same family name.
  const fontUrl = Object.values(manifest).find(
    v => v.file?.includes('geist-latin-wght-normal') && v.file.endsWith('.woff2'),
  ).file;
  await page.evaluate(async url => {
    const face = new FontFace('LateGeist', `url(${url})`, { weight: '100 900' });
    document.fonts.add(face);
    await face.load();
    await document.fonts.ready;
  }, `${assetUrl}/${fontUrl}`);
  await page.waitForFunction(
    commit => Number(document.querySelector('figure')?.dataset.artifactCommit) > commit,
    Number(fallback.artifactCommit),
  );
  await ready();
  const lateFont = { before: fallback, after: await snapshot() };
  assert.notEqual(lateFont.before.artifactInputRevision, lateFont.after.artifactInputRevision);
  assert.notEqual(lateFont.before.viewBox, lateFont.after.viewBox);
  const beforeTheme = await snapshot();
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForFunction(
    commit => Number(document.querySelector('figure')?.dataset.artifactCommit) > commit,
    Number(beforeTheme.artifactCommit),
  );
  await ready();
  await page.evaluate(() => window.integration.sourceChange('flowchart LR\nA[unfinished'));
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'error');
  assert.equal(await page.locator('figure svg').count(), 0);
  await page.evaluate(() => {
    window.integration.sourceChange('flowchart LR\nA[Obsolete] --> B[Old]');
    window.integration.sourceChange('flowchart LR\nA[Newest] --> B[Current]');
  });
  await ready();
  assert((await page.locator('figure').textContent()).includes('Newest'));
  let imageRequests = 0;
  await context.route('https://example.invalid/**', route => {
    imageRequests++;
    return route.abort();
  });
  await page.evaluate(() =>
    window.integration.sourceChange(
      '%%{init: {"links":true,"images":true}}%%\nflowchart LR\nA[Policy guard] --> B@{img: "https://example.invalid/image.png", label: "Image", h: 40}\nclick A "https://example.invalid/link"',
    ),
  );
  await page.waitForFunction(
    () =>
      document.querySelector('figure')?.dataset.artifactPhase === 'ready' &&
      document.querySelector('figure svg')?.textContent.includes('Policy guard'),
  );
  assert.equal(await page.locator('figure a, figure image, figure img, figure script').count(), 0);
  assert.equal(imageRequests, 0);
  await page.evaluate(() => window.integration.sourceChange('flowchart LR\n%%' + 'x'.repeat(50001)));
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'error');
  assert.equal(await page.locator('figure svg').count(), 0);
  await page.evaluate(() => window.integration.sourceChange(window.integration.source));
  await ready();
  let releasePending;
  const pendingFont = new Promise(resolve => {
    releasePending = resolve;
  });
  await context.route('**/*pending-font*', async route => {
    await pendingFont;
    await route.continue();
  });
  await page.evaluate(url => {
    document.fonts.add(new FontFace('PendingGeist', `url(${url})`, { weight: '100 900' }));
    window.integration.family('PendingGeist, monospace');
    window.integration.sourceChange('flowchart LR\nA[Obsolete] --> B[Old]');
  }, `${assetUrl}/${fontUrl}?pending-font=1`);
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'preparing');
  const pendingFontState = await snapshot();
  assert.equal(pendingFontState.artifactFreshness, 'stale');
  assert.equal(await page.locator('figure svg').count(), 1);
  await page.evaluate(() => window.integration.sourceChange('flowchart LR\nA[Only newest] --> B[Current]'));
  releasePending();
  await ready();
  assert((await page.locator('figure').textContent()).includes('Only newest'));
  assert(!(await page.locator('figure').textContent()).includes('Obsolete'));
  let releaseUnmount;
  const unmountFont = new Promise(resolve => {
    releaseUnmount = resolve;
  });
  await context.route('**/*unmount-font*', async route => {
    await unmountFont;
    await route.continue();
  });
  await page.evaluate(url => {
    document.fonts.add(new FontFace('UnmountGeist', `url(${url})`, { weight: '100 900' }));
    window.integration.family('UnmountGeist, monospace');
  }, `${assetUrl}/${fontUrl}?unmount-font=1`);
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'preparing');
  await page.evaluate(() => window.integration.unmount());
  releaseUnmount();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('figure').count(), 0);
  // Fit/compact surfaces must follow layout width, not canvas transform scale.
  await page.evaluate(() => window.integration.mount({ fit: true, compact: true }));
  await ready();
  const compact = await snapshot();
  await page.evaluate(() => window.integration.scale(0.7));
  await page.waitForTimeout(100);
  const scaled = await snapshot();
  assert.equal(compact.width, scaled.width);
  assert.equal(compact.artifactInputRevision, scaled.artifactInputRevision);
  assert(scaled.svgBox.width < compact.svgBox.width);
  assert.equal(await page.locator('figure a, figure button, .pele-zoom').count(), 0);
  await page.evaluate(() => {
    window.integration.unmount();
    window.integration.scale(1);
    window.integration.instances();
  });
  await page.waitForFunction(() => document.querySelectorAll('figure[data-artifact-phase="ready"]').length === 8);
  const accessibility = await page.locator('figure').evaluateAll(figures =>
    figures.map(el => {
      const svg = el.querySelector('svg');
      return {
        ids: [...el.querySelectorAll('[id]')].map(n => n.id),
        refs: ['aria-labelledby', 'aria-describedby'].flatMap(name =>
          (svg.getAttribute(name) || '').split(/\s+/).filter(Boolean),
        ),
      };
    }),
  );
  const ids = accessibility.flatMap(item => item.ids);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of accessibility) {
    assert.equal(item.refs.length, 2);
    for (const ref of item.refs) assert(item.ids.includes(ref));
  }
  assert.deepEqual(errors, []);
  console.log('Diagram font, resize, lifecycle, compact transform, and accessibility regressions passed.');
} catch (error) {
  const diagnostics = await mkdtemp(join(tmpdir(), 'studio-diagram-failure-'));
  await page?.screenshot({ path: join(diagnostics, 'failure.png') }).catch(() => {});
  console.error(`Browser diagnostics: ${diagnostics}`);
  throw error;
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await fixture?.close();
  await assets?.close();
  await rm(cacheDir, { recursive: true, force: true });
}
