import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applySetupChanges, editStudioConfig } from './studio-setup.js';
import { readDeclaration } from '../../src/platform/core/modules/pack.ts';

test('configuration edits preserve unrelated customization and validate syntax', () => {
  const original =
    'export default { name: "Old", modules: { documentation: false }, /* custom */ extra: 7 } satisfies StudioConfig;';
  const next = editStudioConfig(original, { name: "Sam's Studio", usage: 'personal' });
  assert.match(next, /documentation: false/);
  assert.match(next, /extra: 7/);
  assert.match(next, /custom/);
  assert.match(next, /personal/);
  assert.equal(editStudioConfig(next, { name: "Sam's Studio", usage: 'personal' }), next);
  assert.throws(() => editStudioConfig('export default makeConfig();', { name: 'No' }), /default-export an object/);
  assert.throws(
    () => editStudioConfig('export default { name: "First", "name": "Second" };', { name: 'New' }),
    /duplicate/,
  );
  assert.throws(
    () =>
      editStudioConfig('export default { modules: { notes: true, "notes": false } };', { modules: { notes: true } }),
    /duplicate/,
  );
  const commented =
    'export default {\n  modules: { /* keep module note */ "notes": true },\n  defaultSystem: "product", // keep default note\n};\n';
  const withAdmins = editStudioConfig(commented, { admins: ['sam'], modules: { notes: false } });
  assert.match(withAdmins, /keep module note/);
  assert.match(withAdmins, /keep default note/);
  assert.deepEqual(readDeclaration(withAdmins).value.admins, ['sam']);
  assert.equal(readDeclaration(withAdmins).value.modules.notes, false);
  assert.deepEqual(readDeclaration(editStudioConfig('export default {name:"Old"}', { admins: ['sam'] })).value.admins, [
    'sam',
  ]);
});
