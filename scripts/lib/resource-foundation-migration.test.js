import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { viewIdentity, markdownIdentity, canvasIdentity } from '../../src/platform/core/resourceIdentity.ts';
import { readDeclaration } from '../../src/platform/core/declarations.ts';
import { planResourceFoundationMigration, applyResourceFoundationMigration } from './resource-foundation-migration.js';

const types = {
  view: { inPrototype: true, extensions: ['.tsx'], identity: viewIdentity },
  document: { inPrototype: true, extensions: ['.md'], identity: markdownIdentity },
  canvas: { inPrototype: true, extensions: ['.excalidraw'], identity: canvasIdentity },
};
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-foundation-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  write('contributors/pat.json', JSON.stringify({ name: 'Pat', email: '', github: 'pat' }));
  write('src/systems/studio/system.ts', "export default { role: 'platform', label: 'Studio' };");
  write('src/systems/product/system.ts', "// Source contract\nexport default { role: 'prototype', label: 'Product' };");
  write('src/systems/product/components/button.md', '# Button');
  write(
    'studio.config.ts',
    "// Keep this comment\nexport default { name:'Studio', usage:'team', admins:['pat'], modules:{}, systems:['studio','product'], defaultSystem:'product', systemMaintainers:{ product:['pat'] } };",
  );
  write(
    'src/prototypes/pat/example/meta.json',
    JSON.stringify({ title: 'Example', system: 'product', status: 'archived', archivedBySystemId: 'product' }),
  );
  write('src/prototypes/pat/example/main.tsx', "import Other from './_helpers/other';\nexport default () => null;\n");
  write(
    'src/prototypes/pat/example/_helpers/other.ts',
    "export const href = '/prototypes/pat/example/main?mode=source';\n",
  );
  write(
    'src/prototypes/pat/example/notes.md',
    '# Notes\n\n[Source](./main.tsx) [Share](/pat/example/main) [Button](/systems/product/button)\n',
  );
  write(
    'src/prototypes/pat/example/board.excalidraw',
    JSON.stringify({
      elements: [{ id: 'pin', link: '/pat/example/main', version: 4, isDeleted: true }],
      appState: { keep: true },
    }),
  );
  write('src/prototypes/pat/example/asset.bin', Buffer.from([0, 255, 126, 1]));
  write('unrelated.txt', 'Preserve');
  return { root, write };
}
const fileChanges = plan => new Map(plan.changes.map(change => [change.path, change]));

test('one read-only preview composes identities, stable relationships and stored browser links', t => {
  const { root } = fixture(t);
  const plan = planResourceFoundationMigration(root, types, { updated: 123456 });
  const changes = fileChanges(plan);
  for (const change of plan.changes) assert.equal(fs.readFileSync(path.join(root, change.path), 'utf8'), change.before);
  const prototype = plan.resources.find(resource => resource.kind === 'prototype');
  const main = plan.resources.find(resource => resource.path.endsWith('/main.tsx'));
  const system = plan.resources.find(resource => resource.kind === 'system' && resource.key === 'product');
  const person = plan.resources.find(resource => resource.kind === 'contributor');
  const meta = JSON.parse(changes.get(prototype.path).after);
  assert.equal(meta.studioId, prototype.studioId);
  assert.equal(meta.ownerContributorId, person.studioId);
  assert.equal(meta.systemId, system.studioId);
  assert.equal(meta.archivedBySystemId, system.studioId);
  const config = readDeclaration(changes.get('studio.config.ts').after).value;
  assert.equal(config.defaultSystem, system.studioId);
  assert.deepEqual(config.admins, [person.studioId]);
  assert.deepEqual(config.systemMaintainers, { [system.studioId]: [person.studioId] });
  assert.deepEqual(config.systems, ['studio', 'product']);
  assert.ok(changes.get('studio.config.ts').after.startsWith('// Keep this comment'));
  const href = `/prototypes/${prototype.studioId}/artifacts/${main.studioId}`;
  const notes = changes.get('src/prototypes/pat/example/notes.md').after;
  assert.ok(notes.includes(`[Source](./main.tsx)`));
  assert.ok(notes.includes(`[Share](${href})`));
  assert.ok(notes.includes(`[Button](/systems/${system.studioId}/components/button)`));
  assert.ok(changes.get('src/prototypes/pat/example/main.tsx').after.includes("import Other from './_helpers/other'"));
  assert.ok(changes.get('src/prototypes/pat/example/_helpers/other.ts').after.includes(href + '?mode=source'));
  const scene = JSON.parse(changes.get('src/prototypes/pat/example/board.excalidraw').after);
  assert.equal(scene.elements[0].link, href);
  assert.equal(scene.elements[0].version, 5);
  assert.equal(scene.elements[0].updated, 123456);
  assert.deepEqual(scene.appState, { keep: true });
  const serialized = JSON.parse(JSON.stringify(plan));
  assert.deepEqual(
    planResourceFoundationMigration(root, types, {
      ids: Object.fromEntries(plan.resources.map(resource => [resource.path, resource.studioId])),
      updated: plan.updated,
    }),
    serialized,
  );
  const bytes = fs.readFileSync(path.join(root, 'src/prototypes/pat/example/asset.bin'));
  assert.equal(applyResourceFoundationMigration(root, types, serialized).changed, plan.changes.length);
  assert.deepEqual(fs.readFileSync(path.join(root, 'src/prototypes/pat/example/asset.bin')), bytes);
  assert.equal(fs.readFileSync(path.join(root, 'unrelated.txt'), 'utf8'), 'Preserve');
  assert.equal(planResourceFoundationMigration(root, types).changes.length, 0);
});

test('changes to helpers, binary assets, inventory or reviewed payload invalidate the entire preview', t => {
  const { root, write } = fixture(t);
  const plan = planResourceFoundationMigration(root, types);
  for (const mutate of [
    preview => {
      preview.changes[0].after += '\n// Forged';
    },
    preview => {
      preview.changes[0].path = '../outside.txt';
    },
    preview => {
      preview.updated = -1;
    },
  ]) {
    const forged = structuredClone(plan);
    mutate(forged);
    assert.throws(() => applyResourceFoundationMigration(root, types, forged));
  }
  write('src/prototypes/pat/example/_helpers/new.ts', 'export const newFile = true;');
  assert.throws(() => applyResourceFoundationMigration(root, types, plan), /preview changed/);
  fs.unlinkSync(path.join(root, 'src/prototypes/pat/example/_helpers/new.ts'));
  write('src/prototypes/pat/example/asset.bin', Buffer.from([2, 3]));
  assert.throws(() => applyResourceFoundationMigration(root, types, plan), /preview changed/);
  for (const change of plan.changes) assert.equal(fs.readFileSync(path.join(root, change.path), 'utf8'), change.before);
});

test('symbolic assets cannot be concealed by the isolated review workspace', t => {
  const { root } = fixture(t);
  fs.symlinkSync(path.join(root, 'unrelated.txt'), path.join(root, 'src/systems/product/symbolic.txt'));
  assert.throws(() => planResourceFoundationMigration(root, types), /symbolic/);
});

test('retained module declarations are part of review and unsupported prototype sections fail explicitly', t => {
  const { root, write } = fixture(t);
  write('src/modules/custom/module.ts', "export default { id: 'custom', lib: false };");
  const plan = planResourceFoundationMigration(root, types);
  write(
    'src/modules/custom/module.ts',
    "export default { id: 'custom', section: { items: 'prototypes', folder: 'src/examples', byPerson: false } };",
  );
  assert.throws(() => applyResourceFoundationMigration(root, types, plan), /explicit identity policy/);
  for (const change of plan.changes) assert.equal(fs.readFileSync(path.join(root, change.path), 'utf8'), change.before);
});

test('a failed apply rolls back every completed stage and preserves concurrent edits', t => {
  const { root } = fixture(t);
  const plan = planResourceFoundationMigration(root, types);
  const concurrent = path.join(root, plan.changes[0].path);
  const rename = fs.renameSync;
  let writes = 0;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (to.startsWith(root + path.sep) && ++writes === 3) {
      fs.writeFileSync(concurrent, '// Concurrent editor content');
      throw new Error('Injected source write failure');
    }
    return rename(from, to);
  });
  assert.throws(() => applyResourceFoundationMigration(root, types, plan), /some files could not be restored/);
  assert.equal(fs.readFileSync(concurrent, 'utf8'), '// Concurrent editor content');
  for (const change of plan.changes.slice(1))
    assert.equal(fs.readFileSync(path.join(root, change.path), 'utf8'), change.before);
});

test('post-write inventory verification catches concurrent changes beyond files being edited', t => {
  const { root, write } = fixture(t);
  const plan = planResourceFoundationMigration(root, types);
  const rename = fs.renameSync;
  let writes = 0;
  t.mock.method(fs, 'renameSync', (from, to) => {
    const result = rename(from, to);
    if (to.startsWith(root + path.sep) && ++writes === plan.changes.length)
      write('src/prototypes/pat/example/new.txt', 'Concurrent source');
    return result;
  });
  assert.throws(() => applyResourceFoundationMigration(root, types, plan), /inventory changed during/);
  for (const change of plan.changes) assert.equal(fs.readFileSync(path.join(root, change.path), 'utf8'), change.before);
  assert.equal(fs.readFileSync(path.join(root, 'src/prototypes/pat/example/new.txt'), 'utf8'), 'Concurrent source');
});

test('unresolved stored links and computed legacy routes require reconciliation before migration', t => {
  const { root, write } = fixture(t);
  write('src/prototypes/pat/example/notes.md', '[Missing](/prototypes/pat/example/deleted-screen)');
  assert.throws(() => planResourceFoundationMigration(root, types), /unresolved stored browser reference/);
  write('src/prototypes/pat/example/notes.md', '# Notes');
  write('src/prototypes/pat/example/_helpers/other.ts', 'export const href = `/prototypes/${owner}/${folder}/main`;');
  assert.throws(() => planResourceFoundationMigration(root, types), /computed browser reference needs review/);
});
