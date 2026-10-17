import test from 'node:test';
import assert from 'node:assert/strict';
import mdx from '@mdx-js/rollup';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeMermaid from './rehype-mermaid.js';
import fileEmbeds from './rehype-file-embeds.js';

test('Markdown compilation preserves nested Mermaid source, block artifacts, inline links and ordinary code/images', async () => {
  const source = 'flowchart LR\n  A["<Feedback> {draft}"] --> B[Review]\n';
  const markdown =
    '> ```mermaid\n' +
    source.replace(/^/gm, '> ') +
    '```\n\n```js\nconst value = 1;\n```\n\n' +
    '![View](app/main.tsx)\n\n![Canvas](board.excalidraw)\n\n![Document](context.md)\n\n![Flow](../flow.mermaid)\n\n![Sequence](sequence.mmd)\n\nSee ![Flow](flow.mermaid) for context.\n\n![Photo](photo.png)';
  const plugin = mdx({
    format: 'md',
    providerImportSource: '@mdx-js/react',
    rehypePlugins: [rehypeMermaid, fileEmbeds, [rehypePrettyCode, { theme: 'github-dark' }]],
  });
  const compiled = (await plugin.transform.call({}, markdown, '/example.md')).code;
  assert.ok(compiled.includes('"mermaid-diagram"'));
  assert.ok(compiled.includes(JSON.stringify(source)));
  assert.ok(compiled.includes('data-rehype-pretty-code-figure'));
  assert.ok(compiled.includes('"prototype-artifact"'));
  for (const source of ['app/main.tsx', 'board.excalidraw', 'context.md', '../flow.mermaid', 'sequence.mmd'])
    assert.ok(compiled.includes(`source: "${source}"`));
  assert.ok(compiled.includes('"a"'), 'inline references use links rather than block previews');
  assert.ok(compiled.includes('href: "flow.mermaid"'));
  assert.ok(compiled.includes('src: "photo.png"'));
  assert.ok(!compiled.includes('src: "flow.mermaid"'));
});

test('file references resolve nested files and remain within the document prototype', async () => {
  const { artifactReference } = await import('../../app/artifacts/artifactReference.ts');
  const base = '/prototypes/samples/feedback-inbox/research';
  assert.deepEqual(artifactReference('../feedback-flow.mermaid', base), {
    contributor: 'samples',
    prototype: 'feedback-inbox',
    path: 'feedback-flow.mermaid',
  });
  assert.deepEqual(artifactReference('sequence.mmd', base), {
    contributor: 'samples',
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
