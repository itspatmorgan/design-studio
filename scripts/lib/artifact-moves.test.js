import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { fileMoves, repairReferences, repairText, snapshotFiles } from './artifact-moves.js';
import { watchMoves } from '../build/files/watch-moves.js';
import { runOp } from '../build/files/ops.js';
import { ROOT } from '../build/files/paths.js';
import { moveUpdates } from '../build/files/move-updates.js';
import { moveWithLinks, personAddress } from './prototype-links.js';

const address = '/prototypes/sam/sample';
const fixture = () => fs.mkdtempSync(path.join(os.tmpdir(), 'studio-artifact-moves-'));
const write = (root, relative, text) => {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), text);
};

test('a folder move repairs imports inside and outside it, routes, documents and canvas links', () => {
  const root = fixture();
  try {
    write(
      root,
      'flow/main.tsx',
      "import Shared from '../_shared'; import './style.css'; export { Thing } from './_helper'; export default function View() { return <a href='/prototypes/sam/sample/flow/next?state=1#part'>Next</a> }",
    );
    write(root, 'flow/next.tsx', 'export default function Next() { return null }');
    write(root, 'flow/style.css', 'body {}');
    write(root, 'flow/_helper.ts', 'export const Thing=1');
    write(root, '_shared.ts', 'export default 1');
    write(
      root,
      'outer.tsx',
      "export {default} from './flow/main'; const later=()=>import('./flow/next'); const href='/prototypes/sam/sample/flow/main'; const other='https://other.test/prototypes/sam/sample/flow/main';",
    );
    write(
      root,
      'notes.md',
      '[Screen](./flow/main.tsx?mode=source#part)\n[Next](/prototypes/sam/sample/flow/next)\n[ref]: flow/main\n```tsx\n[Example](flow/main.tsx)\n```\n',
    );
    write(root, 'flow/notes.md', '[Shared](../_shared.ts) [Next](next.tsx)');
    write(
      root,
      'board.excalidraw',
      JSON.stringify({ elements: [{ id: 'screen', type: 'embeddable', version: 1, link: address + '/flow/main' }] }),
    );
    const before = snapshotFiles(root);
    fs.mkdirSync(path.join(root, 'nested'));
    fs.renameSync(path.join(root, 'flow'), path.join(root, 'nested', 'flow'));
    const result = repairReferences(root, before, snapshotFiles(root), address);
    assert.equal(result.moves.size, 5);
    assert.match(fs.readFileSync(path.join(root, 'nested/flow/main.tsx'), 'utf8'), /from '..\/..\/_shared'/);
    assert.match(fs.readFileSync(path.join(root, 'nested/flow/main.tsx'), 'utf8'), /import '.\/style.css'/);
    const outer = fs.readFileSync(path.join(root, 'outer.tsx'), 'utf8');
    assert.match(outer, /from '.\/nested\/flow\/main'/);
    assert.match(outer, /import\('.\/nested\/flow\/next'\)/);
    assert.match(outer, /https:\/\/other.test\/prototypes\/sam\/sample\/flow\/main/);
    assert.equal(
      fs.readFileSync(path.join(root, 'nested/flow/notes.md'), 'utf8'),
      '[Shared](../../_shared.ts) [Next](next.tsx)',
    );
    const notes = fs.readFileSync(path.join(root, 'notes.md'), 'utf8');
    assert.match(notes, /nested\/flow\/main.tsx\?mode=source#part/);
    assert.match(notes, /\[ref\]: nested\/flow\/main\n/);
    assert.match(notes, /```tsx\n\[Example\]\(flow\/main.tsx\)/);
    const element = JSON.parse(fs.readFileSync(path.join(root, 'board.excalidraw'), 'utf8')).elements[0];
    assert.equal(element.link, address + '/nested/flow/main');
    assert.equal(element.version, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('copies, hardlink ambiguity and occupied old paths are not guessed as moves', () => {
  assert.deepEqual(
    [
      ...fileMoves(
        new Map([['a.tsx', '1']]),
        new Map([
          ['a.tsx', '1'],
          ['b.tsx', '2'],
        ]),
      ),
    ],
    [],
  );
  assert.deepEqual(
    [
      ...fileMoves(
        new Map([
          ['a.tsx', '1'],
          ['alias.tsx', '1'],
        ]),
        new Map([['b.tsx', '1']]),
      ),
    ],
    [],
  );
  assert.deepEqual(
    [
      ...fileMoves(
        new Map([['a.tsx', '1']]),
        new Map([
          ['a.tsx', '2'],
          ['b.tsx', '1'],
        ]),
      ),
    ],
    [],
  );
});

test('symlinks and hidden files are neither followed nor changed', () => {
  const root = fixture(),
    outside = fixture();
  try {
    write(root, 'main.tsx', 'export default 1');
    write(root, '.hidden.tsx', address + '/main');
    write(outside, 'secret.md', '[Main](' + address + '/main)');
    fs.symlinkSync(outside, path.join(root, 'linked'));
    fs.symlinkSync(path.join(outside, 'secret.md'), path.join(root, 'secret.md'));
    const before = snapshotFiles(root);
    assert.deepEqual([...before.keys()], ['main.tsx']);
    fs.renameSync(path.join(root, 'main.tsx'), path.join(root, 'new.tsx'));
    repairReferences(root, before, snapshotFiles(root), address);
    assert.equal(fs.readFileSync(path.join(outside, 'secret.md'), 'utf8'), '[Main](' + address + '/main)');
    assert.equal(fs.readFileSync(path.join(root, '.hidden.tsx'), 'utf8'), address + '/main');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('renamed files preserve extension styles, query/hash, aliases and longer unrelated URLs', () => {
  const before = new Map([
    ['main.tsx', '1'],
    ['notes.md', '2'],
    ['_parts/index.ts', '3'],
  ]);
  const moves = new Map([
    ['main.tsx', 'new name.tsx'],
    ['_parts/index.ts', '_pieces/index.ts'],
  ]);
  const text =
    "import Page from './main'; import Parts from './_parts'; const lazy=import('./main.tsx?raw'); const alias=import('@/prototypes/sam/sample/main'); const other='/prototypes/sam/sample/main-long'; const target='/sam/sample/main#title';";
  const next = repairText(text, 'notes.tsx', 'notes.tsx', before, moves, address);
  assert.match(next, /'.\/new name'/);
  assert.match(next, /'.\/_pieces'/);
  assert.match(next, /'.\/new name.tsx\?raw'/);
  assert.match(next, /'@\/prototypes\/sam\/sample\/new name'/);
  assert.match(next, /main-long/);
  assert.match(next, /new%20name#title/);
});

test('watcher repairs external renames and prototype folder renames only in supplied scopes', () => {
  const root = fixture(),
    messages = [],
    watcher = new EventEmitter(),
    httpServer = new EventEmitter();
  let dir = root,
    targetAddress = address;
  try {
    write(root, 'main.tsx', 'export default 1');
    write(root, 'next.tsx', "import Page from './main'; const href='/prototypes/sam/sample/main';");
    const watch = watchMoves(
      {
        watcher,
        httpServer,
        ws: { send: message => messages.push(message) },
        config: {
          logger: {
            info() {},
            warn(message) {
              throw new Error(message);
            },
          },
        },
      },
      () => [{ dir, address: targetAddress }],
    );
    fs.renameSync(path.join(root, 'main.tsx'), path.join(root, 'home.tsx'));
    watch.flush();
    assert.match(fs.readFileSync(path.join(root, 'next.tsx'), 'utf8'), /from '.\/home'/);
    assert.deepEqual(messages[0].data, [{ from: address + '/main', to: address + '/home' }]);
    targetAddress = '/prototypes/sam/renamed';
    dir = root + '-renamed';
    fs.renameSync(root, dir);
    watch.flush();
    assert.match(fs.readFileSync(path.join(dir, 'next.tsx'), 'utf8'), /\/prototypes\/sam\/renamed\/home/);
    httpServer.emit('close');
    assert.equal(watcher.listenerCount('all'), 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('app operations repair references before reply and preserve ordering', () => {
  // Stay inside the repository and outside folders copied by concurrent integration tests.
  // node_modules may be linked outside the repository by a removal baseline.
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  const root = fs.mkdtempSync(path.join(ROOT, 'dist', '.file-move-test-'));
  try {
    write(root, 'meta.json', '{"title":"Test","order":["flow/main.tsx"]}');
    write(root, 'flow/main.tsx', 'export default 1');
    write(root, 'next.tsx', "import Screen from './flow/main'; export default Screen");
    const result = runOp(root, { op: 'rename', path: 'flow/main.tsx', name: 'start.tsx' });
    assert.deepEqual(result.movedPaths, [['flow/main.tsx', 'flow/start.tsx']]);
    assert.deepEqual(result.relinkedFiles, ['next.tsx']);
    assert.match(fs.readFileSync(path.join(root, 'next.tsx'), 'utf8'), /'.\/flow\/start'/);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'meta.json'), 'utf8')).order, ['flow/start.tsx']);
    fs.mkdirSync(path.join(root, 'destination'));
    const reorder = runOp(root, { op: 'reorder', path: 'flow/start.tsx', to: 'destination' });
    assert.deepEqual(reorder.movedPaths, [['flow/start.tsx', 'destination/start.tsx']]);
    assert.deepEqual(reorder.relinkedFiles, ['next.tsx']);
    assert.match(fs.readFileSync(path.join(root, 'next.tsx'), 'utf8'), /'.\/destination\/start'/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('move HMR suppression matches only completed move writes and leaves later edits live', () => {
  const root = fixture();
  try {
    write(root, 'new.tsx', 'export default 1');
    write(root, 'other.tsx', "import View from './new'; export default View");
    write(root, 'untouched.tsx', 'export default 2');
    const updates = moveUpdates();
    updates.record(root, { movedPaths: [['old.tsx', 'new.tsx']], relinkedFiles: ['other.tsx'] });
    assert.equal(updates.includes(path.join(root, 'old.tsx')), true);
    assert.equal(updates.includes(path.join(root, 'new.tsx')), true);
    assert.equal(updates.includes(path.join(root, 'other.tsx')), true);
    assert.equal(updates.includes(path.join(root, 'untouched.tsx')), false);
    write(root, 'other.tsx', "import View from './new'; export const changed = true; export default View");
    assert.equal(updates.includes(path.join(root, 'other.tsx')), false);
    write(root, 'old.tsx', 'export default 3');
    assert.equal(updates.includes(path.join(root, 'old.tsx')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('prototype rename/duplicate updates literal code self-links without rewriting external strings', () => {
  const root = fixture();
  try {
    write(root, 'meta.json', '{"title":"Test"}');
    write(
      root,
      'main.tsx',
      "const to='/prototypes/sam/sample/next'; const external='https://other.test/prototypes/sam/sample/next';",
    );
    moveWithLinks(root, root, { title: 'New' }, personAddress('sam', 'sample'), '/prototypes/sam/new', address);
    const next = fs.readFileSync(path.join(root, 'main.tsx'), 'utf8');
    assert.match(next, /to='\/prototypes\/sam\/new\/next'/);
    assert.match(next, /https:\/\/other.test\/prototypes\/sam\/sample\/next/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('prototype-relative screen paths are repaired; dynamic expressions stay unchanged', () => {
  const before = new Map([['flow/main.tsx', '1']]),
    moves = new Map([['flow/main.tsx', 'flow/start.tsx']]);
  const next = repairText(
    "const screen='flow/main'; const dynamic=`flow/${name}`; const link=<ScreenLink to={'flow/main'} />;",
    'main.tsx',
    'main.tsx',
    before,
    moves,
    address,
  );
  assert.equal(
    next,
    "const screen='flow/start'; const dynamic=`flow/${name}`; const link=<ScreenLink to={'flow/start'} />;",
  );
});
