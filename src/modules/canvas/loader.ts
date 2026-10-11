// Every canvas file in a prototype or tool, as text, for the deployed site. In dev the app reads a canvas
// from the file layer instead (open.tsx), which is always current.
// ['/__studio_globs__/*'] is replaced by the list of patterns when Vite reads this file (src/platform/node/build/vite-globs-plugin.js).
export const canvasFiles = import.meta.glob<string>(['/__studio_globs__/*'], { query: '?raw', import: 'default' });

// Vite runs this file again when a file is added or removed, with the new list.
if (import.meta.hot) import.meta.hot.accept();
