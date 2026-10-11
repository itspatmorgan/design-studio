// How a view says it's lofi, and how that is switched on and off, and what a new view starts with (type.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import view from './type.ts';

const { isLofi, setLofi } = view.fidelity!;
const SOURCE = `import { Button } from '@/systems/product/components/button';\n\nexport default function V() { return <Button>Hi</Button>; }\n`;

test('a view with no marker is not lofi', () => {
  assert.equal(isLofi(SOURCE), false);
  assert.equal(isLofi(''), false);
});

test('the marker is a comment at the top, in any comment form', () => {
  assert.equal(isLofi(`/** @lofi */\n${SOURCE}`), true);
  assert.equal(isLofi(`// @lofi\n${SOURCE}`), true);
  assert.equal(isLofi(`/**\n * Checkout, first try.\n * @lofi\n */\n${SOURCE}`), true);
  assert.equal(isLofi(`﻿/** @lofi */\n${SOURCE}`), true);
});

test('a marker below the code, or a word that only starts like it, does not count', () => {
  assert.equal(isLofi(`${SOURCE}// @lofi\n`), false);
  assert.equal(isLofi(`import x from 'y';\n/** @lofi */\n${SOURCE}`), false);
  assert.equal(isLofi(`/** @lofioutdated */\n${SOURCE}`), false);
});

test('switching on adds the marker once, and switching off takes it out again', () => {
  const on = setLofi(SOURCE, true);
  assert.equal(on, `/** @lofi */\n${SOURCE}`);
  assert.equal(setLofi(on, true), on);
  assert.equal(setLofi(on, false), SOURCE);
  assert.equal(setLofi(SOURCE, false), SOURCE);
});

test('switching off from inside a longer comment leaves the rest of it', () => {
  const source = `/**\n * Checkout, first try.\n * @lofi\n */\n${SOURCE}`;
  const off = setLofi(source, false);
  assert.equal(isLofi(off), false);
  assert.match(off, /Checkout, first try\./);
  assert.ok(off.endsWith(SOURCE));
});

test('the byte order mark stays first', () => {
  const on = setLofi(`﻿${SOURCE}`, true);
  assert.ok(on.startsWith('﻿/** @lofi */'));
  assert.equal(setLofi(on, false), `﻿${SOURCE}`);
});

test('a new view exports emptyView, which the platform shows as its empty page, and passes the view check', () => {
  const source = view.template!('user-settings.tsx');
  assert.match(source, /import \{ emptyView \} from '@\/lib\/emptyView'/);
  assert.match(source, /export default emptyView;/);
  assert.deepEqual(view.check!({ source } as never), []);
});
