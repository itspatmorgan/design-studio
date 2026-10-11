import type { ModuleSpec } from '#studio/module';

// The canvas file type: an .excalidraw file is a page to arrange views, documents, and notes on (src/platform/context/file-types.md).
export default {
  lib: false,
  id: 'canvas',
  label: 'Canvases',
  version: '0.1.0',
  requires: '0.3.0',
  description: 'An .excalidraw file opens as a page to arrange views, documents, and notes on.',
  optional: true,
  settings: { group: 'prototyping', order: 2 },
  instructions: [
    { path: 'skills/use-canvas/', when: 'asks for a canvas (a page of views, documents, and notes arranged together)' },
  ],
  dependencies: { '@excalidraw/excalidraw': '0.18.1' },
} satisfies ModuleSpec;
