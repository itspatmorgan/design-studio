import { writeProfiles } from './fixtures/contributors.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readDeclaration } from '../../core/declarations.ts';
import { systemAction } from './system-actions.js';
import { planSystemLifecycle, applySystemLifecycle } from './system-lifecycle.js';
import { writeFixtureConfig } from './fixtures/identities.js';
import { createResourceId } from '../../core/resourceIdentity.ts';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-system-actions-'));
  const config = {
    usage: 'team',
    admins: ['admin'],
    systems: ['studio', 'kit', 'other'],
    systemMaintainers: { kit: [], other: [] },
    defaultSystem: 'other',
  };
  writeProfiles(root, { admin: { name: 'Admin' }, member: { name: 'Member' } });
  for (const id of config.systems) {
    const systemsRoot = id === 'studio' ? 'src/platform/systems' : 'src/systems';
    fs.mkdirSync(path.join(root, systemsRoot, id, 'components'), { recursive: true });
    fs.writeFileSync(
      path.join(root, systemsRoot, id, 'system.ts'),
      `// preserve comment\nexport default { status: 'active', role: '${id === 'studio' ? 'platform' : 'prototype'}', label: '${id}', themeClass: '${id}-theme' };`,
    );
  }
  const { directory } = writeFixtureConfig(root, config);
  function proto(id, meta) {
    const dir = path.join(root, 'src/prototypes/admin', id);
    fs.mkdirSync(dir, { recursive: true });
    const stored = {
      title: id,
      studioId: createResourceId(),
      ownerContributorId: directory.contributorIds.admin,
      systemId: directory.systemIds.kit,
      ...meta,
    };
    if (stored.rebuild)
      stored.rebuild = {
        targetSystemId: directory.systemIds[stored.rebuild.targetSystemId],
        sourcePrototypeId: stored.studioId,
      };
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(stored));
    fs.writeFileSync(
      path.join(dir, 'view.tsx'),
      "import { Button } from '@/systems/kit/components/button'; export default Button;",
    );
    return path.join(dir, 'meta.json');
  }
  return { root, config, proto, directory };
}

test('system actions recheck Admin roles, protect Studio, default and unsafe identities', async () => {
  const { root, config } = fixture();
  try {
    for (const actor of [null, 'missing', 'member'])
      await assert.rejects(systemAction(root, actor, { action: 'rename', system: 'kit', name: 'Changed' }));
    for (const action of ['rename', 'default', 'archive', 'delete', 'restore'])
      await assert.rejects(systemAction(root, 'admin', { action, system: 'studio', name: 'Changed' }), /protected/);
    for (const action of ['archive-check', 'delete-check'])
      await assert.rejects(systemAction(root, 'admin', { action, system: 'other' }), /another default/);
    for (const system of ['../kit', 'missing'])
      await assert.rejects(systemAction(root, 'admin', { action: 'rename', system, name: 'Changed' }), /registered/);
    await assert.rejects(
      systemAction(root, 'admin', { action: 'rename', system: 'kit', name: 'a\ncommand' }),
      /plain name/,
    );
    writeFixtureConfig(root, { ...config, admins: ['member'] });
    await assert.rejects(systemAction(root, 'admin', { action: 'archived' }), /Admin/);
    assert.deepEqual(await systemAction(root, 'member', { action: 'archived' }), { items: [] });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('archive and restore track only prototypes archived together; delete preserves rebuild source', () => {
  const { root, config, proto, directory } = fixture();
  try {
    const active = proto('active', {}),
      old = proto('old', { status: 'archived' });
    applySystemLifecycle(planSystemLifecycle(root, config, 'archive', 'kit'));
    assert.equal(JSON.parse(fs.readFileSync(active)).archivedBySystemId, directory.systemIds.kit);
    assert.equal(JSON.parse(fs.readFileSync(old)).archivedBySystemId, undefined);
    applySystemLifecycle(planSystemLifecycle(root, config, 'restore', 'kit', { restorePrototypes: true }));
    assert.equal(JSON.parse(fs.readFileSync(active)).status, undefined);
    assert.equal(JSON.parse(fs.readFileSync(old)).status, 'archived');
    const before = fs.readFileSync(path.join(path.dirname(active), 'view.tsx'), 'utf8');
    applySystemLifecycle(planSystemLifecycle(root, config, 'delete', 'kit'));
    assert.equal(fs.existsSync(path.join(root, 'src/systems/kit')), false);
    assert.deepEqual(
      readDeclaration(fs.readFileSync(path.join(root, 'studio.config.ts'), 'utf8')).value.systemMaintainers,
      { [directory.systemIds.other]: [] },
    );
    assert.equal(fs.existsSync(path.join(root, '.trash')), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(active)).systemMissing, {
      systemId: directory.systemIds.kit,
      label: 'kit',
    });
    assert.equal(fs.readFileSync(path.join(path.dirname(active), 'view.tsx'), 'utf8'), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('true rename preserves identity relationships and share links, repairs source dependencies, and rolls back failed validation', () => {
  const { root, config, proto, directory } = fixture();
  try {
    config.systemMaintainers.kit = ['member'];
    writeFixtureConfig(root, config);
    const meta = proto('example', {
      rebuild: { targetSystemId: 'kit', sourcePrototypeId: 'src/prototypes/admin/example' },
    });
    fs.writeFileSync(path.join(root, 'src/systems/kit/components/button.tsx'), 'export const Button = () => null;');
    fs.writeFileSync(
      path.join(root, 'README.md'),
      `[Kit](src/systems/kit/system.ts) [Overview](/systems/${directory.systemIds.kit}) [External](https://example.com/systems/kit/button)`,
    );
    const sourceMeta = fs.readFileSync(meta, 'utf8');
    fs.writeFileSync(path.join(root, 'src/systems/kit/components/button.css'), '@import "./button-theme.css";');
    fs.writeFileSync(path.join(root, 'src/systems/kit/components/button-theme.css'), '.button { color: red; }');
    const plan = planSystemLifecycle(root, config, 'rename', 'kit', { name: 'Team Kit' });
    assert.throws(
      () =>
        applySystemLifecycle(plan, () => {
          throw new Error('check failed');
        }),
      /check failed/,
    );
    assert.equal(fs.existsSync(path.join(root, 'src/systems/kit')), true);
    assert.equal(fs.readFileSync(meta, 'utf8'), sourceMeta);
    applySystemLifecycle(planSystemLifecycle(root, config, 'rename', 'kit', { name: 'Team Kit' }));
    assert.equal(fs.readFileSync(meta, 'utf8'), sourceMeta);
    assert.deepEqual(
      readDeclaration(fs.readFileSync(path.join(root, 'studio.config.ts'), 'utf8')).value.systemMaintainers,
      { [directory.systemIds.kit]: [directory.contributorIds.member], [directory.systemIds.other]: [] },
    );
    assert.equal(JSON.parse(fs.readFileSync(meta)).rebuild.targetSystemId, directory.systemIds.kit);
    assert.match(fs.readFileSync(path.join(path.dirname(meta), 'view.tsx'), 'utf8'), /@\/systems\/team-kit\//);
    assert.ok(fs.readFileSync(path.join(root, 'README.md'), 'utf8').includes(`/systems/${directory.systemIds.kit})`));
    assert.ok(fs.readFileSync(path.join(root, 'README.md'), 'utf8').includes('src/systems/team-kit/system.ts'));
    assert.match(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), /https:\/\/example.com\/systems\/kit\/button/);
    assert.match(
      fs.readFileSync(path.join(root, 'src/systems/team-kit/components/button.css'), 'utf8'),
      /\.\/button-theme\.css/,
    );
    const spec = fs.readFileSync(path.join(root, 'src/systems/team-kit/system.ts'), 'utf8');
    assert.match(spec, /preserve comment/);
    assert.match(spec, /kit-theme/);
    assert.match(spec, /Team Kit/);
    assert.throws(
      () =>
        planSystemLifecycle(root, { ...config, systems: ['studio', 'team-kit', 'other'] }, 'rename', 'team-kit', {
          name: 'Other',
        }),
      /already/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
