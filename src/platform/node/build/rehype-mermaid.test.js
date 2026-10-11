import test from 'node:test';
import assert from 'node:assert/strict';
import mdx from '@mdx-js/rollup';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeMermaid from './rehype-mermaid.js';
import { contentPalette, documentCodeTheme } from '../../systems/studio/styles/contentPalette.js';

test('Mermaid source survives compilation while ordinary code still highlights', async () => {
  const source = 'flowchart LR\n  A["<Feedback> {draft}"] --> B[Review]\n';
  const markdown = '```mermaid\n' + source + '```\n\n```js\nconst value = 1;\n```';
  const plugin = mdx({
    format: 'md',
    providerImportSource: '@mdx-js/react',
    rehypePlugins: [
      rehypeMermaid,
      [rehypePrettyCode, { theme: { light: documentCodeTheme('light'), dark: documentCodeTheme('dark') } }],
    ],
  });
  const compiled = (await plugin.transform.call({}, markdown, '/test.md')).code;
  assert.ok(compiled.includes('"mermaid-diagram"'));
  assert.ok(compiled.includes(JSON.stringify(source)));
  assert.ok(compiled.includes('data-rehype-pretty-code-figure'));
  assert.ok(!compiled.includes('language-mermaid'));
  assert.ok(compiled.includes(contentPalette.light.green), 'light syntax uses the shared keyword color');
  assert.ok(compiled.includes(contentPalette.dark.green), 'dark syntax uses the shared keyword color');
});

test('Only Mermaid code fences are replaced, including inside nested content', () => {
  const code = language => ({
    type: 'element',
    tagName: 'pre',
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: { className: [language] },
        children: [{ type: 'text', value: 'A --> B\n' }],
      },
    ],
  });
  const ordinary = code('language-js');
  const tree = { children: [{ tagName: 'blockquote', children: [code('language-mermaid'), ordinary] }] };
  rehypeMermaid()(tree);
  assert.equal(tree.children[0].children[0].tagName, 'mermaid-diagram');
  assert.equal(tree.children[0].children[0].properties.source, 'A --> B\n');
  assert.equal(tree.children[0].children[1], ordinary);
});

test('prototype file images compile into block embeds while inline references stay links', async () => {
  const { default: diagramFiles } = await import('./rehype-file-embeds.js');
  const plugin = mdx({ format: 'md', providerImportSource: '@mdx-js/react', rehypePlugins: [diagramFiles] });
  const markdown =
    '![View](app/main.tsx)\n\n![Canvas](board.excalidraw)\n\n![Document](context.md)\n\n![Feedback flow](../feedback-flow.mermaid)\n\n![Sequence](sequence.mmd)\n\nSee ![Flow](flow.mermaid) for context.\n\n![Photo](photo.png)';
  const compiled = (await plugin.transform.call({}, markdown, '/example.md')).code;
  assert.ok(compiled.includes('"prototype-artifact"'));
  assert.ok(compiled.includes('"../feedback-flow.mermaid"'));
  assert.ok(compiled.includes('"sequence.mmd"'));
  for (const path of ['app/main.tsx', 'board.excalidraw', 'context.md'])
    assert.ok(compiled.includes(`source: "${path}"`));
  assert.ok(compiled.includes('href: "flow.mermaid"'));
  assert.ok(compiled.includes('src: "photo.png"'));
  assert.ok(!compiled.includes('src: "flow.mermaid"'));
});

test('file references resolve nested files and remain within the document prototype', async () => {
  const { artifactReference } = await import('../../app/artifacts/artifactReference.ts');
  const base = '/prototypes/patrick/feedback-inbox/research';
  assert.deepEqual(artifactReference('../feedback-flow.mermaid', base), {
    contributor: 'patrick',
    prototype: 'feedback-inbox',
    path: 'feedback-flow.mermaid',
  });
  assert.deepEqual(artifactReference('sequence.mmd', base), {
    contributor: 'patrick',
    prototype: 'feedback-inbox',
    path: 'research/sequence.mmd',
  });
  for (const source of [
    '../../other/flow.mermaid',
    'https://example.com/flow.mermaid',
    '//example.com/flow.mmd',
    '../_helpers/flow.mermaid',
    '../../../alex/private/flow.mermaid',
    '../../feedback-inbox%2F..%2Fother/flow.mermaid',
  ])
    assert.equal(artifactReference(source, base), null, source);
  assert.equal(artifactReference('flow.mermaid', '/systemContent/context'), null);
  assert.equal(artifactReference('flow.mermaid', null), null);
  for (const path of ['app/main.tsx', 'board.excalidraw', 'context.md', 'notes.txt'])
    assert.equal(artifactReference(path, base)?.path, `research/${path}`);
});

test('file previews respect the Node-readable capability surfaces to bound canvas nesting', async () => {
  const { embedFor } = await import('../../app/data/fileTypeModule.ts');
  const Embed = () => null;
  const spec = surfaces => ({ inPrototype: true, inSystemContent: false, capabilities: { embeds: surfaces } });
  assert.equal(embedFor(undefined, { Embed }, 'document', 'prototype'), undefined);
  assert.equal(embedFor(spec([]), { Embed }, 'canvas', 'prototype'), undefined);
  assert.equal(embedFor(spec(['document', 'canvas']), { Embed }, 'canvas', 'prototype'), Embed);
  assert.equal(embedFor(spec(['document']), { Embed }, 'document', 'prototype'), Embed);
  assert.equal(embedFor(spec(['document']), { Embed }, 'canvas', 'prototype'), undefined);
  assert.equal(embedFor(spec(['document']), undefined, 'document', 'prototype'), undefined);
});
