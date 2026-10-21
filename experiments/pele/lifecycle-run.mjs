import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:4167/lifecycle.html');
await page.waitForFunction(() => window.lifecycleProbe);
const results = {};
for (const engine of ['mermaid', 'pele']) {
  results[engine] = await page.evaluate(engine => window.lifecycleProbe(engine), engine);
}
for (const [engine, r] of Object.entries(results)) {
  for (const state of [r.ready, r.rapid, r.recovered, r.theme]) {
    assert.equal(state.artifactPhase, 'ready');
    assert.equal(state.artifactFreshness, 'current');
    assert.equal(state.artifactInputRevision, state.artifactDisplayedRevision);
    assert.equal(state.svg, true);
  }
  assert(r.rapid.text.includes('Latest'));
  assert(!r.rapid.text.includes('Obsolete'));
  assert.equal(r.invalid.artifactPhase, 'error');
  assert.equal(r.invalid.svg, false);
  assert.equal(r.unmounted, true);
}
assert.deepEqual(errors, []);
results.errors = errors;
await writeFile(new URL('results/lifecycle.json', import.meta.url), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await browser.close();
