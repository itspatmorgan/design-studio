import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
export default {
  root,
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 4167, strictPort: true },
  preview: { host: '127.0.0.1', port: 4167, strictPort: true },
  build: {
    outDir: 'dist',
    manifest: true,
    rolldownOptions: {
      input: {
        comparison: root + '/index.html',
        lifecycle: root + '/lifecycle.html',
        integration: root + '/integration.html',
      },
    },
  },
};
