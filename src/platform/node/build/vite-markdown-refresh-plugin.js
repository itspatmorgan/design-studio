// All Studio Markdown readers update in place, without a document reload.
//
// Vite refreshes a component file in place, but a Markdown file also exports its frontmatter, which
// React Fast Refresh treats as incompatible, so a save reloaded the whole page. Instead, each
// document accepts its own updates and announces the new version with a "studio:markdown" event;
// the document loader (src/platform/app/data/createLoader.ts) takes it from there.
// vite.config.ts leaves Markdown out of Fast Refresh so these contracts do not compete.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export default function markdownRefresh() {
  return {
    name: 'prototype-markdown-refresh',
    apply: 'serve',
    enforce: 'post', // after the Markdown compiler, so this is added to the compiled module
    transform(code, id) {
      const file = id.split('?')[0];
      if (!file.startsWith(SRC + path.sep) || !file.endsWith('.md')) return null;
      // The id is the file's key in the loader's glob: "/prototypes/patrick/hello-world/notes.md".
      const key = '/' + path.relative(SRC, file).split(path.sep).join('/');
      return {
        code: `${code}\nif (import.meta.hot) import.meta.hot.accept((mod) => { if (mod) window.dispatchEvent(new CustomEvent('studio:markdown', { detail: { key: ${JSON.stringify(key)}, reference: ${JSON.stringify(/[?&]reference(?:&|$)/.test(id))}, mod } })); });\n`,
        map: null,
      };
    },
  };
}
