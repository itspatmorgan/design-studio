// Every system content file that isn't a document, as text, for the deployed site. In dev the app reads a file
// from the file layer instead (open.tsx), which is always current. Images and other binary files
// aren't items (src/platform/node/build/build-manifest.js), so they aren't listed here.
// ['/__studio_globs__/*'] is replaced by the list of patterns when Vite reads this file (src/platform/node/build/vite-globs-plugin.js).
export const textFiles = import.meta.glob<string>(['/__studio_globs__/*'], { query: '?raw', import: 'default' });

// Vite runs this file again when a file is added or removed, with the new list.
if (import.meta.hot) import.meta.hot.accept();
