import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const root = fileURLToPath(new URL('.', import.meta.url));
export default {
  root,
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 4167, strictPort: true },
  preview: { host: '127.0.0.1', port: 4167, strictPort: true },
  plugins: [
    {
      name: 'isolated-pele-lifecycle-candidate',
      resolveId(id) {
        if (id === 'virtual:pele-component') return '\0eval-pele.tsx';
      },
      load(id) {
        if (id !== '\0eval-pele.tsx') return;
        const original = readFileSync(
          new URL('../../src/platform/app/diagrams/MermaidDiagram.tsx', import.meta.url),
          'utf8',
        );
        const start = original.indexOf('// Mermaid has global configuration.');
        const end = original.indexOf('export function MermaidDiagram');
        if (start < 0 || end < start) throw new Error('Shared renderer changed; review candidate splice.');
        return (
          original.slice(0, start) +
          `
async function render(source: string, id: string, themeVariables: ReturnType<typeof mermaidTheme>) {
  const delay = (globalThis as any).__peleDelayMs;
  if (delay) await new Promise(resolve => setTimeout(resolve, delay));
  const pele = await import('pele');
  const result = pele.render(source, {
    idPrefix: id, autoDirection: false, fontFamily: themeVariables.fontFamily, fontSize: 14,
    links: false, images: false, limit: 50000, outputLimit: 4000000, maxEdges: 500,
  });
  const template = document.createElement('template'); template.innerHTML = result.svg;
  const svg = template.content.querySelector('svg')!;
  const colors = {bg: themeVariables.background, fg: themeVariables.textColor, muted: themeVariables.labelTextColor,
    line: themeVariables.lineColor, surface: themeVariables.primaryColor, 'surface-alt': themeVariables.clusterBkg,
    border: themeVariables.primaryBorderColor};
  for (const [key, value] of Object.entries(colors)) svg.style.setProperty('--pele-' + key, value);
  themeVariables.xyChart.plotColorPalette.split(',').forEach((color: string, i: number) => svg.style.setProperty('--pele-series-' + (i+1), color));
  return svg.outerHTML;
}
` +
          original.slice(end)
        ).replace("from './mermaidTheme'", "from '@/platform/app/diagrams/mermaidTheme'");
      },
    },
  ],
  build: {
    outDir: 'dist',
    manifest: true,
    rolldownOptions: { input: { comparison: root + '/index.html', lifecycle: root + '/lifecycle.html' } },
  },
};
