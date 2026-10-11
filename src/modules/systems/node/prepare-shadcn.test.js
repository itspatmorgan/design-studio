import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { prepareShadcn, saveShadcnConfig } from './prepare-shadcn.js';

test('staging isolates all upstream writes and preserves the target', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'curation-fixture-'));
  let plan;
  try {
    fs.mkdirSync(path.join(root, 'src/systems/example'), { recursive: true });
    fs.mkdirSync(path.join(root, 'node_modules/shadcn'), { recursive: true });
    const declaration = "export default { role: 'prototype', status: 'active', studioId: '4f3m7z08hk5a0k53' };\n";
    fs.writeFileSync(path.join(root, 'src/systems/example/system.ts'), declaration);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({
        packageManager: 'pnpm@12.8.2',
        dependencies: { react: '19', 'react-dom': '19' },
        devDependencies: { tailwindcss: '4', vite: '8' },
      }),
    );
    fs.writeFileSync(path.join(root, 'node_modules/shadcn/package.json'), JSON.stringify({ version: '4.21.0' }));
    plan = prepareShadcn(root, 'example', { preset: 'nova', components: ['button', 'dialog'] });
    assert.ok(!plan.workspace.startsWith(root));
    assert.equal(fs.readFileSync(path.join(root, 'src/systems/example/system.ts'), 'utf8'), declaration);
    assert.deepEqual(fs.readdirSync(path.join(root, 'src/systems/example')), ['system.ts']);
    assert.equal(plan.source.cliVersion, '4.21.0');
    assert.equal(plan.target.studioId, '4f3m7z08hk5a0k53');
    for (const command of plan.commands) assert.ok(command.includes(plan.workspace));
    assert.ok(plan.commands.some(command => command.includes('--dry-run')));
    assert.ok(!fs.existsSync(path.join(root, 'components.json')));
    assert.ok(!fs.existsSync(path.join(plan.workspace, 'node_modules')));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(plan.workspace, 'curation-plan.json'), 'utf8')), plan);
    assert.throws(() => prepareShadcn(root, '../example'), /source key/);
    assert.throws(() => prepareShadcn(root, 'example', { preset: 'https://example.com' }), /preset code/);
    assert.throws(() => prepareShadcn(root, 'example', { components: ['../escape'] }), /by name/);
    fs.writeFileSync(
      path.join(root, 'src/systems/example/system.ts'),
      "export default {role:'prototype',status:'archived'};",
    );
    assert.throws(() => prepareShadcn(root, 'example'), /active system/);
  } finally {
    if (plan) fs.rmSync(plan.workspace, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('system configuration survives staging and capture without redirecting writes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'curation-config-'));
  const plans = [];
  const target = path.join(root, 'src/systems/example');
  try {
    fs.mkdirSync(target, { recursive: true });
    fs.mkdirSync(path.join(root, 'node_modules/shadcn'), { recursive: true });
    fs.writeFileSync(
      path.join(target, 'system.ts'),
      "export default { role: 'prototype', status: 'active', studioId: '4f3m7z08hk5a0k53' };\n",
    );
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({
        dependencies: { react: '19', 'react-dom': '19', 'tailwind-merge': '3' },
        devDependencies: { tailwindcss: '4', vite: '8' },
      }),
    );
    fs.writeFileSync(path.join(root, 'node_modules/shadcn/package.json'), JSON.stringify({ version: '4.21.0' }));
    const config = {
      style: 'radix-maia',
      iconLibrary: 'lucide',
      tailwind: { css: 'styles/theme.css', baseColor: 'stone', cssVariables: true },
      aliases: { ui: '@/systems/example/components' },
      registries: { '@example': 'https://example.com/{name}.json' },
    };
    const original = JSON.stringify(config);
    fs.writeFileSync(path.join(target, 'components.json'), original);
    fs.writeFileSync(path.join(root, 'components.json'), 'invalid root configuration is deliberately ignored');
    fs.writeFileSync(path.join(root, 'DESIGN.md'), '# Brand\nUse square controls.\n');
    const plan = prepareShadcn(root, 'example', { components: ['button'], designMd: 'DESIGN.md' });
    plans.push(plan);
    assert.equal(plan.source.base, 'radix');
    assert.equal(plan.source.configuration, 'system');
    assert.equal(plan.source.preset, null);
    assert.ok(!plan.commands.some(command => command.includes('init')));
    const staged = JSON.parse(fs.readFileSync(path.join(plan.workspace, 'components.json'), 'utf8'));
    assert.equal(staged.style, config.style);
    assert.deepEqual(staged.registries, config.registries);
    assert.equal(staged.aliases.ui, '@/components/ui');
    assert.equal(staged.tailwind.css, 'src/index.css');
    assert.equal(fs.readFileSync(path.join(plan.workspace, 'DESIGN.md'), 'utf8'), '# Brand\nUse square controls.\n');
    assert.equal(plan.source.designMd.sha256.length, 64);
    assert.equal(fs.readFileSync(path.join(target, 'components.json'), 'utf8'), original);
    const replacement = prepareShadcn(root, 'example', { preset: 'https://ui.shadcn.com/create?preset=b0' });
    plans.push(replacement);
    assert.equal(replacement.source.base, 'radix');
    assert.equal(replacement.source.preset, 'https://ui.shadcn.com/create?preset=b0');
    assert.ok(replacement.commands.some(command => command.includes('init') && command.includes('b0')));
    assert.throws(
      () => prepareShadcn(root, 'example', { preset: 'https://ui.shadcn.com/create?template=vite' }),
      /valid preset code/,
    );
    const switched = prepareShadcn(root, 'example', { base: 'base' });
    plans.push(switched);
    assert.equal(switched.source.preset, 'maia');
    assert.equal(switched.source.base, 'base');
    // A resolved upstream configuration must never persist staging or foreign-system destinations.
    staged.aliases.ui = '@/systems/other/components';
    staged.tailwind.css = '/outside.css';
    fs.writeFileSync(path.join(plan.workspace, 'components.json'), JSON.stringify(staged));
    fs.writeFileSync(path.join(target, 'components.json'), original + '\n');
    assert.throws(() => saveShadcnConfig(root, 'example', plan.workspace), /changed since/);
    fs.writeFileSync(path.join(target, 'components.json'), original);
    saveShadcnConfig(root, 'example', plan.workspace);
    const saved = JSON.parse(fs.readFileSync(path.join(target, 'components.json'), 'utf8'));
    assert.equal(saved.aliases.ui, '@/systems/example/components');
    assert.equal(saved.tailwind.css, 'styles/theme.css');
    assert.deepEqual(saved.registries, config.registries);
    assert.equal(saved.style, config.style);
    fs.writeFileSync(
      path.join(target, 'system.ts'),
      "export default { role: 'prototype', status: 'active', studioId: 'aaaaaaaaaaaaaaaa' };\n",
    );
    assert.throws(() => saveShadcnConfig(root, 'example', plan.workspace), /does not belong/);
  } finally {
    for (const plan of plans) fs.rmSync(plan.workspace, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  }
});
