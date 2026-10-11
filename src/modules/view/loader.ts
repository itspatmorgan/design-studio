import type { ComponentType } from 'react';
import { createLoader } from '@/platform/app/data/createLoader';

// A view file's default export.
export type ViewModule = { default: ComponentType };

// Every view file, .tsx or .jsx, at any depth, in prototypes and in the modules that hold prototype-shaped
// folders (custom sections). Helpers (names starting with an underscore) aren't views. ['/__studio_globs__/*'] is replaced by
// the list of patterns when Vite reads this file (scripts/build/vite-globs-plugin.js).
export const views = createLoader<ViewModule>(import.meta.glob<ViewModule>(['/__studio_globs__/*']), import.meta.hot);

// Vite runs this file again when a file is added or removed, with the new list (createLoader.ts).
if (import.meta.hot) import.meta.hot.accept();
