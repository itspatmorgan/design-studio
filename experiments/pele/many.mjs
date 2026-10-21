import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4167/?automated');
  await page.waitForFunction(() => window.evaluation);
  const results = await page.evaluate(async () => {
    const api = window.evaluation,
      batches = {};
    await document.fonts.ready;
    for (const engine of ['mermaid', 'pele', 'pele-lazy']) {
      await api.load(engine);
      const warmup = document.createElement('div');
      document.body.append(warmup);
      for (const f of api.fixtures.slice(0, 8)) await api.renderOne(engine, f.source, warmup, { paint: false });
      warmup.remove();
      batches[engine] = [];
      for (let iteration = 0; iteration < 5; iteration++) {
        const host = document.createElement('div');
        document.body.append(host);
        const started = performance.now(),
          samples = [];
        for (const f of api.fixtures.slice(0, 8)) {
          const target = document.createElement('div');
          target.style.width = '768px';
          host.append(target);
          samples.push(await api.renderOne(engine, f.source, target, { paint: false }));
        }
        const beforePaint = performance.now();
        await api.frame();
        batches[engine].push({
          totalMs: performance.now() - started,
          workMs: beforePaint - started,
          renderMs: samples.reduce((a, s) => a + s.renderMs, 0),
          insertMs: samples.reduce((a, s) => a + s.insertMs, 0),
          layoutMs: samples.reduce((a, s) => a + s.layoutMs, 0),
        });
        host.remove();
      }
    }
    return batches;
  });
  await writeFile(new URL('results/many.json', import.meta.url), JSON.stringify(results, null, 2));
  console.log(results);
} finally {
  await browser.close();
}
