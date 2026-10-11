import assert from 'node:assert/strict';
import test from 'node:test';
import { artifactShortcut, previewShortcut } from '../../app/shell/artifactShortcuts.ts';

const quote = {
  code: 'Quote',
  key: "'",
  metaKey: true,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
};

test('source and grid shortcuts remain distinct on Mac and Windows', () => {
  for (const modifiers of [
    { metaKey: true, ctrlKey: false },
    { metaKey: false, ctrlKey: true },
  ]) {
    assert.equal(artifactShortcut({ ...quote, ...modifiers }), 'source');
    assert.equal(artifactShortcut({ ...quote, ...modifiers, shiftKey: true, key: '"' }), 'grid');
  }
});

test('other shortcuts, composition, repeats, and AltGr are left alone', () => {
  for (const change of [
    { code: 'KeyS', key: 's' },
    { metaKey: false },
    { altKey: true },
    { repeat: true },
    { isComposing: true },
    { metaKey: false, ctrlKey: true, altKey: true },
  ]) {
    assert.equal(artifactShortcut({ ...quote, ...change }), null);
  }
});

test('preview forwarding includes shell commands without stealing typing modifiers', () => {
  for (const modifiers of [
    { metaKey: true, ctrlKey: false },
    { metaKey: false, ctrlKey: true },
  ]) {
    assert.equal(previewShortcut({ ...quote, ...modifiers, code: 'KeyK', key: 'k' }), 'palette');
    assert.equal(previewShortcut({ ...quote, ...modifiers, code: 'Semicolon', key: ';' }), 'navigation');
    assert.equal(previewShortcut({ ...quote, ...modifiers }), 'source');
    assert.equal(previewShortcut({ ...quote, ...modifiers, shiftKey: true }), 'grid');
  }
  for (const change of [
    { altKey: true },
    { shiftKey: true },
    { repeat: true },
    { isComposing: true },
    { metaKey: false, ctrlKey: false },
  ])
    assert.equal(previewShortcut({ ...quote, code: 'KeyK', key: 'k', ...change }), null);
});
