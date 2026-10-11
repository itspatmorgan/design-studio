import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { classHighlighter, highlightTree } from '@lezer/highlight';
import { mermaidSource } from '../../core/source/mermaidSource.ts';
import { markdownSource } from '../../core/source/markdownSource.ts';

const diagram = 'flowchart LR\n  %% Review path\n  feedback[Feedback] --> review{Review}\n';
function tokens(doc, extensions) {
  const state = EditorState.create({ doc, extensions });
  const tree = ensureSyntaxTree(state, doc.length, 1000);
  assert.ok(tree, 'the editor parses the complete source');
  const result = [];
  highlightTree(tree, classHighlighter, (from, to, style) => result.push([doc.slice(from, to), style]));
  return result;
}

test('standalone Mermaid highlights diagram names, comments, identifiers and labels', () => {
  const highlighted = tokens(diagram, mermaidSource());
  for (const pair of [
    ['flowchart', 'tok-typeName'],
    ['%% Review path', 'tok-comment'],
    ['feedback', 'tok-variableName'],
    ['Feedback', 'tok-string'],
  ]) {
    assert.ok(
      highlighted.some(([text, style]) => text === pair[0] && style.includes(pair[1])),
      pair.join(': '),
    );
  }
});

test('Mermaid fences use the standalone grammar while preserving YAML and JavaScript highlighting', () => {
  const doc = '---\ntitle: Review\n---\n\n```mermaid\n' + diagram + '```\n\n```js\nconst count = 42;\n```\n';
  const highlighted = tokens(doc, markdownSource());
  for (const pair of tokens(diagram, mermaidSource()))
    assert.ok(highlighted.some(token => token[0] === pair[0] && token[1] === pair[1]));
  assert.ok(highlighted.some(([text, style]) => text === 'title' && style.includes('tok-propertyName')));
  assert.ok(highlighted.some(([text, style]) => text === 'const' && style.includes('tok-keyword')));
  assert.ok(highlighted.some(([text, style]) => text === '42' && style.includes('tok-number')));
});

test('unsupported Mermaid diagrams and incomplete edits remain editable', () => {
  for (const source of ['architecture-beta\n  service api(server)[API]', 'flowchart LR\n  feedback[']) {
    const state = EditorState.create({ doc: source, extensions: mermaidSource() });
    const updated = state.update({ changes: { from: source.length, insert: '\n' } }).state;
    assert.equal(updated.doc.toString(), source + '\n');
    assert.ok(ensureSyntaxTree(updated, updated.doc.length, 1000));
  }
});
