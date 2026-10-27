import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWorkspace, scaffoldWorkspace, removeWorkspace } from './scaffold.ts';

test('a view can have only one workspace and retains its identity, fidelity, and design source', () => {
  const source = '/** @studio-id q8rr3bhdrwxhcntr */\n/** @lofi */\nconst radius = 24;\nexport default function View() { return radius; }\n';
  const added = scaffoldWorkspace(source);
  assert.ok(added.endsWith(source));
  assert.deepEqual(readWorkspace(added), { version: 1 });
  assert.equal(scaffoldWorkspace(added), added);
  assert.equal(removeWorkspace(added), source);
  assert.equal(removeWorkspace(source), source);
});

test('workspace discovery is limited to supported declarations in the source header', () => {
  assert.equal(readWorkspace('// @dialkit-lab {broken}\nexport default null;'), null);
  assert.equal(readWorkspace('// @dialkit-lab {"version":2}\nexport default null;'), null);
  assert.equal(readWorkspace('export const text = "// @dialkit-lab {\\"version\\":1}";'), null);
});
