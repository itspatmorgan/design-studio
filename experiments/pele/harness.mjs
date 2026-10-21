import '../../src/platform/systems/studio/styles/theme.css';
import './style.css';
import { mermaidTheme } from '../../src/platform/app/diagrams/mermaidTheme.ts';
import fixtures from './fixtures.json';
export { fixtures };
const engines = {},
  imports = {};
const clock = () => performance.now();
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
let serial = 0;
export async function load(engine) {
  if (!engines[engine]) {
    const start = clock();
    engines[engine] =
      engine === 'mermaid'
        ? (await import('mermaid')).default
        : engine === 'pele-lazy'
          ? await import('pele/lazy')
          : await import('pele');
    imports[engine] = clock() - start;
  }
  return imports[engine];
}
function peleOptions(id, width, auto, dark) {
  const theme = mermaidTheme(dark);
  return {
    idPrefix: id,
    maxWidth: width,
    autoDirection: auto,
    fontFamily: theme.fontFamily,
    fontSize: 14,
    links: false,
    images: false,
    limit: 50000,
    outputLimit: 4000000,
    maxEdges: 500,
  };
}
function initMermaid(dark) {
  const themeVariables = mermaidTheme(dark);
  engines.mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    look: 'classic',
    themeVariables,
    fontFamily: themeVariables.fontFamily,
    suppressErrorRendering: true,
    secure: [
      'secure',
      'securityLevel',
      'startOnLoad',
      'maxTextSize',
      'maxEdges',
      'suppressErrorRendering',
      'theme',
      'themeVariables',
      'fontFamily',
    ],
  });
}
export async function renderOne(
  engine,
  source,
  target,
  { width = 768, auto = false, dark = false, paint = true } = {},
) {
  await load(engine);
  const id = `eval-${engine}-${++serial}`;
  if (engine === 'mermaid') initMermaid(dark);
  const start = clock();
  let svg;
  try {
    const options = engine === 'mermaid' ? null : peleOptions(id, width, auto, dark);
    svg =
      engine === 'mermaid'
        ? (await engines.mermaid.render(id, source)).svg
        : engine === 'pele-lazy'
          ? (await engines[engine].renderAsync(source, options)).svg
          : engines.pele.render(source, options).svg;
  } catch (e) {
    target.replaceChildren();
    target.textContent = String(e.message || e);
    return { error: target.textContent, renderMs: clock() - start };
  }
  const rendered = clock();
  const theme = mermaidTheme(dark);
  const variables = {
    bg: theme.background,
    fg: theme.textColor,
    muted: theme.labelTextColor,
    line: theme.lineColor,
    surface: theme.primaryColor,
    'surface-alt': theme.clusterBkg,
    border: theme.primaryBorderColor,
    accent: theme.xyChart.plotColorPalette.split(',')[0],
    critical: theme.xyChart.plotColorPalette.split(',')[7],
  };
  for (const [key, value] of Object.entries(variables)) target.style.setProperty(`--pele-${key}`, value);
  theme.xyChart.plotColorPalette
    .split(',')
    .forEach((color, i) => target.style.setProperty(`--pele-series-${i + 1}`, color));
  target.innerHTML = svg;
  const inserted = clock();
  // Force layout separately; the two-frame measurement is paint opportunity, not pure paint cost.
  const bounds = target.getBoundingClientRect();
  const laidOut = clock();
  if (paint) await frame();
  const painted = clock();
  const root = target.querySelector('svg');
  const ids = [...target.querySelectorAll('[id]')].map(n => n.id);
  const refs = ['aria-labelledby', 'aria-describedby'].flatMap(a =>
    (root?.getAttribute(a) || '').split(/\s+/).filter(Boolean),
  );
  const vb = root?.viewBox.baseVal;
  const clipped = [...target.querySelectorAll('text')]
    .filter(n => {
      const box = n.getBBox();
      // SVG-space transforms matter: map each text box to the root coordinate system.
      const matrix = root.getScreenCTM()?.inverse().multiply(n.getScreenCTM());
      if (!matrix || !vb) return false;
      return [
        [box.x, box.y],
        [box.x + box.width, box.y + box.height],
      ].some(([x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform(matrix);
        return p.x < vb.x - 2 || p.y < vb.y - 2 || p.x > vb.x + vb.width + 2 || p.y > vb.y + vb.height + 2;
      });
    })
    .map(n => n.textContent);
  return {
    renderMs: rendered - start,
    insertMs: inserted - rendered,
    layoutMs: laidOut - inserted,
    paintOpportunityMs: painted - laidOut,
    svgBytes: new TextEncoder().encode(svg).length,
    viewBox: root?.getAttribute('viewBox'),
    bounds: { width: bounds.width, height: bounds.height },
    ids,
    refs,
    missingRefs: refs.filter(r => !ids.includes(r)),
    title: target.querySelector('title')?.textContent,
    description: target.querySelector('desc')?.textContent,
    links: target.querySelectorAll('a').length,
    images: target.querySelectorAll('image,img').length,
    activeContent: target.querySelectorAll('script,[onload],[onerror]').length,
    clipped,
  };
}
export async function compare(index, palette = 'light', surface = 'document', auto = false, repeats = 1) {
  document.documentElement.classList.toggle('dark', palette === 'dark');
  document.body.dataset.surface = surface;
  await document.fonts.ready;
  const width = { document: 768, narrow: 360, full: 960, compact: 280 }[surface];
  const main = document.querySelector('main');
  main.replaceChildren();
  const result = { name: fixtures[index].name, palette, surface, auto, engines: {} };
  for (const engine of ['mermaid', 'pele']) {
    const article = document.createElement('article');
    const heading = document.createElement('h2');
    heading.textContent = engine === 'mermaid' ? 'Mermaid 11.17.2' : 'Pele 1.8.0';
    const target = document.createElement('div');
    target.className = `diagram ${surface}`;
    target.style.width = `${width}px`;
    article.append(heading, target);
    main.append(article);
    const samples = [];
    for (let r = 0; r < repeats; r++)
      samples.push(await renderOne(engine, fixtures[index].source, target, { width, auto, dark: palette === 'dark' }));
    result.engines[engine] = { importMs: imports[engine], samples };
  }
  const allIds = [...main.querySelectorAll('[id]')].map(n => n.id);
  result.duplicateIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  document.querySelector('#status').textContent = `${fixtures[index].name} · ${palette} · ${surface}`;
  return result;
}
for (const [index, fixture] of fixtures.entries()) {
  const option = document.createElement('option');
  option.value = index;
  option.textContent = fixture.name;
  document.querySelector('#fixture').append(option);
}
const run = () =>
  compare(
    Number(document.querySelector('#fixture').value),
    document.querySelector('#palette').value,
    document.querySelector('#surface').value,
    document.querySelector('#auto').checked,
  ).catch(e => {
    document.querySelector('#status').textContent = String(e);
  });
document.querySelector('#render').onclick = run;
window.evaluation = {
  compare,
  renderOne,
  load,
  fixtures,
  frame,
  outputLimitProbe: () => {
    try {
      engines.pele.render(fixtures[0].source, { outputLimit: 100, links: false, images: false });
      return 'NOT REJECTED';
    } catch (e) {
      return e.message;
    }
  },
};
if (!new URL(location.href).searchParams.has('automated')) await run();
else document.querySelector('#status').textContent = 'Ready for measurement';
