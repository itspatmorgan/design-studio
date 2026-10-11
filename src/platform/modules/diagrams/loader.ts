// Raw Mermaid source is bundled only for enabled, published prototype items.
export const diagramFiles = import.meta.glob<string>(['/__studio_globs__/*'], { query: '?raw', import: 'default' });

if (import.meta.hot) import.meta.hot.accept();
