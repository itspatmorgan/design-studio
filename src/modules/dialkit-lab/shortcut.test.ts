import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDialKitShortcut } from './shortcut.ts';
const chord = { key: ':', code: 'Semicolon', metaKey: true, ctrlKey: false, shiftKey: true, altKey: false, repeat: false, isComposing: false, defaultPrevented: false };
test('DialKit shortcut supports Mac and Control chords including shifted semicolon characters', () => {
  assert.equal(isDialKitShortcut(chord), true);
  assert.equal(isDialKitShortcut({ ...chord, metaKey: false, ctrlKey: true }), true);
  assert.equal(isDialKitShortcut({ ...chord, code: '', key: ';' }), true);
});
test('DialKit chord leaves navigation, typing, composition, repeat and handled events alone', () => {
  for (const key of ['altKey', 'repeat', 'isComposing', 'defaultPrevented'] as const) assert.equal(isDialKitShortcut({ ...chord, [key]: true }), false);
  assert.equal(isDialKitShortcut({ ...chord, shiftKey: false }), false);
  assert.equal(isDialKitShortcut({ ...chord, metaKey: false }), false);
  assert.equal(isDialKitShortcut({ ...chord, key: 'k', code: 'KeyK' }), false);
});
