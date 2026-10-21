import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const evidence = new URL('adoption/', import.meta.url);
await mkdir(evidence, { recursive: true });
const manifest = JSON.parse(await readFile(new URL('dist/.vite/manifest.json', root), 'utf8'));
const css = manifest['index.html'].css[0];
const browser = await chromium.launch();
const errors = [];
const report = {};
const deadline = setTimeout(() => void browser.close(), 120000);
try {
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
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4167/integration.html');
  await page.addStyleTag({ url: `http://127.0.0.1:4173/${css}` });
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
  report.fontWait = { heldFonts, ready: await snapshot() };
  assert.equal(await page.evaluate(() => document.fonts.check('14px "Geist Variable"')), true);
  report.widths = [];
  for (const width of [360, 280, 768]) {
    const before = await snapshot();
    await page.evaluate(width => window.integration.width(width), width);
    await page.waitForFunction(
      commit => Number(document.querySelector('figure')?.dataset.artifactCommit) > commit,
      Number(before.artifactCommit),
    );
    await ready();
    const after = await snapshot();
    report.widths.push(after);
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
  report.reveal = await snapshot();
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
  }, `http://127.0.0.1:4173/${fontUrl}`);
  await page.waitForFunction(
    commit => Number(document.querySelector('figure')?.dataset.artifactCommit) > commit,
    Number(fallback.artifactCommit),
  );
  await ready();
  report.lateFont = { before: fallback, after: await snapshot() };
  assert.notEqual(report.lateFont.before.artifactInputRevision, report.lateFont.after.artifactInputRevision);
  assert.notEqual(report.lateFont.before.viewBox, report.lateFont.after.viewBox);
  const beforeTheme = await snapshot();
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForFunction(
    commit => Number(document.querySelector('figure')?.dataset.artifactCommit) > commit,
    Number(beforeTheme.artifactCommit),
  );
  await ready();
  report.dark = await snapshot();
  await page.evaluate(() => window.integration.sourceChange('flowchart LR\nA[unfinished'));
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'error');
  assert.equal(await page.locator('figure svg').count(), 0);
  await page.evaluate(() => {
    window.integration.sourceChange('flowchart LR\nA[Obsolete] --> B[Old]');
    window.integration.sourceChange('flowchart LR\nA[Newest] --> B[Current]');
  });
  await ready();
  assert((await page.locator('figure').textContent()).includes('Newest'));
  report.recovered = await snapshot();
  await page.screenshot({ path: new URL('component-dark.png', evidence).pathname });
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
  }, `http://127.0.0.1:4173/${fontUrl}?pending-font=1`);
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'preparing');
  report.pendingFont = await snapshot();
  assert.equal(report.pendingFont.artifactFreshness, 'stale');
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
  }, `http://127.0.0.1:4173/${fontUrl}?unmount-font=1`);
  await page.waitForFunction(() => document.querySelector('figure')?.dataset.artifactPhase === 'preparing');
  await page.evaluate(() => window.integration.unmount());
  releaseUnmount();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('figure').count(), 0);
  await context.close();

  const app = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  app.on('pageerror', e => errors.push(e.message));
  await app.goto('http://127.0.0.1:4173/documentation/context/platform.core/context/diagrams');
  await app.waitForFunction(() => document.querySelectorAll('figure svg.pele').length === 7);
  await app.waitForFunction(() =>
    [...document.querySelectorAll('figure[data-artifact-phase]')].every(e => e.dataset.artifactPhase === 'ready'),
  );
  report.document = await app.locator('figure svg.pele').count();
  assert.equal(report.document, 7);
  report.documentAccessibility = await app.locator('main').first().ariaSnapshot();
  const ids = await app.locator('figure [id]').evaluateAll(nodes => nodes.map(n => n.id));
  assert.equal(new Set(ids).size, ids.length);
  await app.screenshot({ path: new URL('document.png', evidence).pathname });
  await app.setViewportSize({ width: 720, height: 1000 });
  await app.waitForTimeout(200);
  await app.waitForFunction(() =>
    [...document.querySelectorAll('figure[data-artifact-phase]')].every(e => e.dataset.artifactPhase === 'ready'),
  );
  report.documentNarrow = await app.locator('figure svg.pele').count();
  await app.goto('http://127.0.0.1:4173/prototypes/ccncfpcyaa1hvjts/artifacts/nmm7cmqq20sry69h');
  await app.waitForSelector('figure[data-artifact-phase="ready"] svg.pele');
  report.standalone = await app.locator('figure').evaluate(el => ({
    ...el.dataset,
    svg: el.querySelector('svg').getBoundingClientRect().toJSON(),
    host: el.getBoundingClientRect().toJSON(),
  }));
  await app.screenshot({ path: new URL('standalone.png', evidence).pathname });
  await app.setViewportSize({ width: 1440, height: 1000 });
  await app.goto('http://127.0.0.1:4173/prototypes/ccncfpcyaa1hvjts/artifacts/n897fx5zb7wr42cb');
  await app.waitForSelector('figure[data-artifact-phase="ready"] svg.pele');
  const figure = app.locator('figure:has(svg.pele)').first();
  const geometry = () =>
    figure.evaluate(el => ({
      ...el.dataset,
      hostWidth: el.clientWidth,
      box: el.getBoundingClientRect().toJSON(),
      svg: el.querySelector('svg').getBoundingClientRect().toJSON(),
      interaction: Boolean(el.querySelector('.pele-zoom')),
    }));
  const before = await geometry();
  await app.screenshot({ path: new URL('canvas-before.png', evidence).pathname });
  await app.mouse.move(
    before.box.x + Math.min(30, before.box.width / 2),
    before.box.y + Math.min(30, before.box.height / 2),
  );
  await app.mouse.wheel(90, 70);
  await app.waitForTimeout(300);
  const panned = await geometry();
  assert(
    Math.abs(before.box.x - panned.box.x) + Math.abs(before.box.y - panned.box.y) > 5,
    'wheel over diagram must pan canvas',
  );
  await app.keyboard.down('Control');
  await app.mouse.wheel(0, -120);
  await app.keyboard.up('Control');
  await app.waitForTimeout(300);
  const zoomed = await geometry();
  assert(Math.abs(zoomed.box.width - panned.box.width) > 1, 'modifier-wheel must zoom canvas');
  assert.equal(before.hostWidth, zoomed.hostWidth, 'zoom must not change intrinsic renderer width');
  assert.equal(before.artifactInputRevision, zoomed.artifactInputRevision, 'zoom must not trigger layout rerender');
  assert.equal(zoomed.interaction, false);
  report.canvas = { before, panned, zoomed };
  await app.evaluate(() => document.documentElement.classList.add('dark'));
  await app.waitForFunction(
    revision =>
      document.querySelector('figure')?.dataset.artifactInputRevision !== revision &&
      document.querySelector('figure')?.dataset.artifactPhase === 'ready',
    zoomed.artifactInputRevision,
  );
  report.canvas.dark = await geometry();
  await app.screenshot({ path: new URL('canvas-after.png', evidence).pathname });
  const header = app.locator('a[href*="nmm7cmqq20sry69h"]').last();
  await header.focus();
  await app.keyboard.press('Enter');
  await app.waitForURL('**/artifacts/nmm7cmqq20sry69h');
  report.keyboardOpen = true;
  assert.deepEqual(errors, []);
  report.errors = errors;
  await writeFile(new URL('checks.json', evidence), JSON.stringify(report, null, 2));
  console.log('Font, resize, lifecycle, document, standalone, canvas pan/zoom and keyboard checks passed.');
} finally {
  clearTimeout(deadline);
  await browser.close();
}
