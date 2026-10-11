import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  artifactAddress,
  canvasIdentity,
  createResourceId,
  diagramIdentity,
  markdownIdentity,
  prototypeAddress,
  resourceId,
  systemAddress,
  viewIdentity,
} from './resourceIdentity.ts';

const first = resourceId('0123456789abcdef'),
  second = resourceId('abcdefghjkmnpqrs');

test('resource IDs have a fixed alphabet and reject path fragments and ambiguous encodings', () => {
  for (const invalid of [
    '',
    null,
    123,
    '../0123456789abc',
    '0123456789ABCDEF',
    '0123456789abcdei',
    '0123456789abcdefg',
    '0123456789abcde%',
  ])
    assert.throws(() => resourceId(invalid));
  assert.equal(createResourceId().length, 16);
  assert.equal(resourceId(createResourceId()).length, 16);
  assert.equal(prototypeAddress(first), `/prototypes/${first}`);
  assert.equal(artifactAddress(first, second), `/prototypes/${first}/artifacts/${second}`);
  assert.equal(systemAddress(first), `/systems/${first}`);
});

test('view identity survives lofi comments, BOM and CRLF without rewriting executable source', () => {
  const source = '\uFEFF/** @lofi */\r\nexport default function View() { return "@studio-id example"; }\r\n';
  const written = viewIdentity.write(source, first);
  assert.equal(viewIdentity.read(written), first);
  assert.equal(written, '\uFEFF/** @studio-id 0123456789abcdef */\r\n' + source.slice(1));
  assert.equal(viewIdentity.write(written, first), written);
  assert.equal(viewIdentity.read(viewIdentity.write(written, second)), second);
  assert.equal(viewIdentity.read(source), null);
  assert.throws(() => viewIdentity.read('/** @studio-id */\nexport default null;'));
  assert.throws(() =>
    viewIdentity.read(`/** @studio-id ${first} */\n/** @studio-id ${second} */\nexport default null;`),
  );
});

test('Markdown identity preserves frontmatter and body and rejects malformed or duplicate declarations', () => {
  const source = '\uFEFF---\r\ntitle: Checkout\r\n---\r\n\r\n[Payment](./payment.tsx)\r\n';
  const written = markdownIdentity.write(source, first);
  assert.equal(markdownIdentity.read(written), first);
  assert.equal(written, source.replace('title: Checkout', `studioId: ${first}\r\ntitle: Checkout`));
  assert.equal(markdownIdentity.write(written, first), written);
  assert.equal(markdownIdentity.read(markdownIdentity.write(written, second)), second);
  assert.equal(markdownIdentity.read(markdownIdentity.write('# Notes\n', first)), first);
  assert.throws(() => markdownIdentity.write('---\ntitle: Broken\n', first));
  assert.throws(() => markdownIdentity.read(`---\nstudioId: ${first}\nstudioId: ${second}\n---\n`));
  assert.throws(() => markdownIdentity.read('---\nstudioId: null\n---\n'));
});

test('diagram identity remains a valid leading Mermaid comment', () => {
  const source = '\uFEFF%% Existing comment\r\nflowchart LR\r\n A --> B\r\n';
  const written = diagramIdentity.write(source, first);
  assert.equal(diagramIdentity.read(written), first);
  assert.equal(written, `\uFEFF%% @studio-id ${first}\r\n${source.slice(1)}`);
  assert.equal(diagramIdentity.write(written, first), written);
  assert.equal(diagramIdentity.read(diagramIdentity.write(written, second)), second);
  assert.throws(() => diagramIdentity.read(`%% @studio-id ${first}\n%% @studio-id ${second}\nflowchart LR`));
});

test('canvas identity preserves scene data and rejects invalid identity instead of replacing it', () => {
  const scene = {
    elements: [{ id: 'frame-id', type: 'frame' }],
    appState: { gridSize: 20 },
    studioVersion: 1,
    custom: { retained: true },
  };
  const written = canvasIdentity.write(JSON.stringify(scene), first);
  assert.equal(canvasIdentity.read(written), first);
  assert.deepEqual(JSON.parse(written), { ...scene, studioId: first });
  assert.equal(canvasIdentity.write(written, first), written);
  assert.equal(canvasIdentity.read(canvasIdentity.write(written, second)), second);
  assert.throws(() => canvasIdentity.read('[]'));
  assert.throws(() => canvasIdentity.write('{"studioId":"invalid"}', first));
  assert.throws(() => canvasIdentity.read(`{"studioId":"${first}","studioId":"${second}"}`));
  assert.throws(() => canvasIdentity.read(`{"studioId":"${first}","\\u0073tudioId":"${second}"}`));
  assert.equal(canvasIdentity.read(`{"custom":{"studioId":"${second}"},"studioId":"${first}"}`), first);
});
