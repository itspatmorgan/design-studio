// How a prototype's files are arranged (order.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterChange, byOrder, parseOrder, place, withFolderOrder } from './order.ts';

const f = (path: string) => ({ path, name: path.split('/').pop()!, dir: false });
const d = (path: string) => ({ path, name: path.split('/').pop()!, dir: true });
const paths = (list: { path: string }[]) => list.map(e => e.path);

test('without an order, files come first, then folders, each alphabetical', () => {
  assert.deepEqual(paths(byOrder([d('b'), f('z.md'), d('a'), f('m.tsx')])), ['m.tsx', 'z.md', 'a', 'b']);
});

test('listed paths come first in their sequence, and the rest follow in the default order', () => {
  const list = [f('a.tsx'), f('b.tsx'), d('c'), f('d.tsx')];
  assert.deepEqual(paths(byOrder(list, ['c', 'd.tsx'])), ['c', 'd.tsx', 'a.tsx', 'b.tsx']);
});

test('an order can name paths that are gone', () => {
  assert.deepEqual(paths(byOrder([f('a.tsx'), f('b.tsx')], ['gone.tsx', 'b.tsx'])), ['b.tsx', 'a.tsx']);
});

test('parseOrder accepts only a list of paths', () => {
  assert.deepEqual(parseOrder(['a', 'b/c']), ['a', 'b/c']);
  assert.equal(parseOrder('a'), null);
  assert.equal(parseOrder([1]), null);
  assert.equal(parseOrder(['']), null);
});

test('place puts a path before another, or last', () => {
  assert.deepEqual(place(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
  assert.deepEqual(place(['a', 'b', 'c'], 'a', ''), ['b', 'c', 'a']);
  assert.deepEqual(place(['a', 'b', 'c'], 'a', 'c'), ['b', 'a', 'c']);
  assert.deepEqual(place(['a', 'b'], 'x', 'b'), ['a', 'x', 'b']);
});

test("setting a folder's order leaves other folders' entries alone", () => {
  assert.deepEqual(withFolderOrder(['a', 'f/x', 'f/y'], 'f', ['f/y', 'f/x']), ['a', 'f/y', 'f/x']);
  assert.deepEqual(withFolderOrder(['a', 'f/x'], '', ['b', 'a']), ['f/x', 'b', 'a']);
});

test("renaming, moving, or deleting updates the list, taking a folder's contents along", () => {
  assert.deepEqual(afterChange(['a', 'f', 'f/x'], 'f', 'g'), ['a', 'g', 'g/x']);
  assert.deepEqual(afterChange(['a', 'f', 'f/x'], 'f', null), ['a']);
  assert.deepEqual(afterChange(['f', 'fx'], 'f', 'g'), ['g', 'fx']);
});
