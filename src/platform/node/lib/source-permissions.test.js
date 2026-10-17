import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeProfiles } from './fixtures/contributors.js';
import { canWriteSource, prototypeOwnershipMatches } from '../build/files/policy.js';
import { documentationSources, sourceFile } from '../build/files/source.js';
import { writeFixtureConfig } from './fixtures/identities.js';

test('source writes recheck revoked grants and archive status without waiting for a restart', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-source-permissions-'));
  const config = {
    usage: 'team',
    admins: ['admin'],
    systems: ['product'],
    defaultSystem: 'product',
    systemMaintainers: { product: ['sam'] },
  };
  const save = () => writeFixtureConfig(root, config);
  try {
    writeProfiles(root, { admin: { name: 'Admin' }, sam: { name: 'Sam' } });
    fs.mkdirSync(path.join(root, 'src/systems/product'), { recursive: true });
    const spec = path.join(root, 'src/systems/product/system.ts');
    fs.writeFileSync(spec, "export default { role: 'prototype', status: 'active' };");
    const permanentId = save().directory.systemIds.product;
    assert.equal(canWriteSource('sam', 'src/systems/product/components/button.tsx', root), true);
    assert.equal(canWriteSource('sam', 'src/platform/core/config.ts', root), false);
    assert.equal(canWriteSource('admin', 'src/prototypes/sam/example/view.tsx', root), true);
    assert.equal(canWriteSource('sam', 'src/prototypes/admin/example/view.tsx', root), false);
    assert.equal(canWriteSource('sam', '../src/systems/product/system.ts', root), false);
    assert.equal(
      canWriteSource(
        'sam',
        'src/systems/product/system.ts',
        root,
        "export default { role: 'prototype', status: 'archived' };",
      ),
      false,
    );
    assert.equal(
      canWriteSource(
        'sam',
        'src/systems/product/system.ts',
        root,
        `export default { studioId:'${permanentId}', role: 'prototype', status: 'active', description: 'Updated' };`,
      ),
      true,
    );
    config.systemMaintainers.product = [];
    save();
    assert.equal(canWriteSource('sam', 'src/systems/product/components/button.tsx', root), false);
    config.systemMaintainers.product = ['sam'];
    save();
    fs.writeFileSync(spec, `export default { studioId:'${permanentId}', role: 'prototype', status: 'archived' };`);
    assert.equal(canWriteSource('sam', 'src/systems/product/components/button.tsx', root), false);
    assert.equal(canWriteSource('admin', 'src/systems/product/components/button.tsx', root), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source editor preserves prototype identity and refuses owner/location mismatches', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-owner-source-'));
  try {
    writeProfiles(root, { pat: { name: 'Pat', studioId: '0123456789abcdef' } });
    writeFixtureConfig(root, {
      usage: 'personal',
      systems: ['product'],
      defaultSystem: 'product',
      systemMaintainers: { product: [] },
    });
    const folder = path.join(root, 'src/prototypes/pat/example');
    fs.mkdirSync(folder, { recursive: true });
    const metadata = { title: 'Example', studioId: 'abcdefghjkmnpqrs', ownerContributorId: '0123456789abcdef' };
    fs.writeFileSync(path.join(folder, 'meta.json'), JSON.stringify(metadata));
    assert.equal(prototypeOwnershipMatches('pat', folder, root), true);
    assert.equal(prototypeOwnershipMatches('other', folder, root), false);
    const file = 'src/prototypes/pat/example/meta.json';
    assert.equal(canWriteSource('pat', file, root, JSON.stringify({ ...metadata, title: 'Updated' })), true);
    for (const field of ['studioId', 'ownerContributorId'])
      assert.equal(
        canWriteSource('pat', file, root, JSON.stringify({ ...metadata, [field]: '23456789abcdefgh' })),
        false,
      );
    fs.writeFileSync(
      path.join(folder, 'meta.json'),
      JSON.stringify({ ...metadata, ownerContributorId: '23456789abcdefgh' }),
    );
    assert.equal(prototypeOwnershipMatches('pat', folder, root), false);
    assert.equal(canWriteSource('pat', 'src/prototypes/pat/example/main.tsx', root), false);
    fs.writeFileSync(path.join(folder, 'meta.json'), JSON.stringify({ title: 'Example', studioId: metadata.studioId }));
    assert.equal(prototypeOwnershipMatches('pat', folder, root), false);
    fs.writeFileSync(
      path.join(folder, 'meta.json'),
      JSON.stringify(metadata).replace(
        '"ownerContributorId":',
        '"ownerContributorId":"23456789abcdefgh","ownerContributorId":',
      ),
    );
    assert.equal(prototypeOwnershipMatches('pat', folder, root), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source catalogs preserve repair access and refuse stale, oversized, linked or unlisted writes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-source-catalog-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const relative = 'src/platform/README.md',
    file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '---\ntitle: broken');
  const manifest = {
    contributions: {},
    platformReferences: [{ references: [{ source: '/platform/README.md' }, { source: '/platform/README.md' }] }],
  };
  const allowed = documentationSources(root, manifest);
  assert.deepEqual(allowed, [relative]);
  const call = request => sourceFile(root, allowed, { path: relative, ...request });
  const before = call({ action: 'read' }).body;
  assert.equal(before.content, '---\ntitle: broken');
  fs.writeFileSync(file, '# External edit');
  assert.equal(call({ action: 'write', base: before.version, content: '# Overwrite' }).status, 409);
  assert.equal(fs.readFileSync(file, 'utf8'), '# External edit');
  const current = call({ action: 'read' }).body;
  assert.equal(call({ action: 'write', base: current.version, content: '# Repaired' }).status, undefined);
  assert.equal(fs.readFileSync(file, 'utf8'), '# Repaired');
  assert.equal(call({ action: 'write', base: current.version, content: 'x'.repeat(750 * 1024 + 1) }).status, 413);
  assert.equal(fs.readFileSync(file, 'utf8'), '# Repaired');
  assert.equal(call({ action: 'read', path: '../../README.md' }).status, 404);
  manifest.platformReferences = [];
  assert.equal(sourceFile(root, documentationSources(root, manifest), { action: 'read', path: relative }).status, 404);
  fs.renameSync(file, file + '.ordinary');
  fs.symlinkSync(file + '.ordinary', file);
  assert.equal(call({ action: 'read' }).status, 404);
  assert.equal(call({ action: 'write', content: '# Linked overwrite', base: current.version }).status, 404);
  assert.equal(fs.readFileSync(file + '.ordinary', 'utf8'), '# Repaired');
});
