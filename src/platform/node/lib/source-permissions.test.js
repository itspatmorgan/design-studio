import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeProfiles } from './fixtures/contributors.js';
import { canWriteSource, prototypeOwnershipMatches } from '../build/files/policy.js';
import { writeFixtureConfig } from './fixtures/identities.js';

test('source writes recheck revoked grants and archive status without waiting for a restart', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-source-permissions-'));
  const config = {
    usage: 'team',
    admins: ['admin'],
    systems: ['studio', 'product'],
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
      systems: ['studio', 'product'],
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
