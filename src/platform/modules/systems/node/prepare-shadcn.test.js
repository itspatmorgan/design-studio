import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { prepareShadcn } from './prepare-shadcn.js';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'curation-fixture-'));
  const target = path.join(root, 'src/systems/example');
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(
    path.join(target, 'system.ts'),
    "export default { role: 'prototype', status: 'active', studioId: '4f3m7z08hk5a0k53' };\n",
  );
  fs.copyFileSync('package.json', path.join(root, 'package.json'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const prepare = options => {
    const result = prepareShadcn(root, 'example', options);
    t.after(() => fs.rmSync(result.workspace, { recursive: true, force: true }));
    return result;
  };
  return { root, target, prepare };
}

test('upstream writes stay in staging and preparation never changes the target', t => {
  const { root, target, prepare } = fixture(t);
  const before = fs.readFileSync(path.join(target, 'system.ts'), 'utf8');
  const result = prepare({ preset: 'https://ui.shadcn.com/create?preset=b0', components: ['button'] });
  assert.ok(!result.workspace.startsWith(root));
  for (const command of result.commands) assert.ok(command.includes(result.workspace));
  assert.ok(result.commands.some(command => command.includes('--dry-run')));
  assert.ok(result.commands.find(command => command.includes('init')).includes('b0'));
  assert.equal(fs.readFileSync(path.join(target, 'system.ts'), 'utf8'), before);
  assert.deepEqual(fs.readdirSync(target), ['system.ts']);
  assert.throws(() => prepareShadcn(root, '../example'), /source key/);
  assert.throws(() => prepare({ preset: 'https://example.com' }), /preset/);
  assert.throws(() => prepare({ components: ['../escape'] }), /by name/);
  fs.writeFileSync(path.join(target, 'system.ts'), "export default {status:'archived'};");
  assert.throws(() => prepare(), /active system/);
});

test('saved choices and design input are reused with every write destination remapped', t => {
  const { root, target, prepare } = fixture(t);
  const config = {
    style: 'radix-maia',
    iconLibrary: 'lucide',
    tailwind: { css: 'styles/theme.css' },
    aliases: { ui: '@/systems/example/components' },
    registries: { '@example': 'https://example.com/{name}.json' },
  };
  const original = JSON.stringify(config);
  fs.writeFileSync(path.join(target, 'components.json'), original);
  fs.writeFileSync(path.join(root, 'DESIGN.md'), '# Direction');
  const result = prepare({ designMd: 'DESIGN.md' });
  const staged = JSON.parse(fs.readFileSync(path.join(result.workspace, 'components.json')));
  assert.equal(staged.style, config.style);
  assert.equal(staged.iconLibrary, config.iconLibrary);
  assert.deepEqual(staged.registries, config.registries);
  assert.equal(staged.tailwind.css, 'src/index.css');
  assert.deepEqual(staged.aliases, {
    components: '@/components',
    ui: '@/components/ui',
    utils: '@/utils',
    lib: '@/lib',
    hooks: '@/hooks',
  });
  assert.ok(!result.commands.some(command => command.includes('init')));
  assert.equal(fs.readFileSync(path.join(result.workspace, 'DESIGN.md'), 'utf8'), '# Direction');
  assert.equal(fs.readFileSync(path.join(target, 'components.json'), 'utf8'), original);
});
