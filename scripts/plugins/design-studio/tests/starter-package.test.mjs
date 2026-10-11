import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { packageStarter, starterIncludes } from '../../../../plugins/design-studio/scripts/starter-package.mjs';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-package-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const files = [
    'src/platform/skills/review/SKILL.md',
    '.agents/skills/review/SKILL.md',
    'studio.config.ts',
    'contributors.json',
    'contributors/sam.json',
    'scripts/cli/studio.js',
    '.agents/studio-skills.json',
    'patches/fix.patch',
    'plugins/design-studio/plugin.json',
    '.agents/plugins/marketplace.json',
    '.claude-plugin/marketplace.json',
    '.cursor-plugin/marketplace.json',
    'scripts/eval/results.json',
    'scripts/plugins/design-studio/check-package.mjs',
    '.github/workflows/check.yml',
  ];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'preserved content');
  }
  fs.mkdirSync(path.join(root, '.claude/skills'), { recursive: true });
  fs.symlinkSync('../../.agents/skills/review', path.join(root, '.claude/skills/review'));
  files.push('.claude/skills/review');
  return { root, files };
}

test('starter retains working code and linked skills while omitting distribution and evaluations', t => {
  const { root, files } = fixture(t);
  packageStarter(root, files);
  for (const file of [
    'studio.config.ts',
    'contributors.json',
    'contributors/sam.json',
    'scripts/cli/studio.js',
    'patches/fix.patch',
    'src/platform/skills/review/SKILL.md',
  ]) {
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), 'preserved content');
  }
  assert.equal(fs.readFileSync(path.join(root, '.claude/skills/review/SKILL.md'), 'utf8'), 'preserved content');
  for (const file of [
    'plugins',
    '.agents/plugins',
    '.claude-plugin',
    '.cursor-plugin',
    '.github',
    'scripts/eval',
    'scripts/plugins',
  ])
    assert.ok(!fs.existsSync(path.join(root, file)));
  assert.match(
    fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
    /Your studio and all its source files live locally/,
  );
});

test('invalid paths and links fail before package contents are removed', t => {
  const { root, files } = fixture(t);
  assert.throws(() => packageStarter(root, [...files, '../outside']), /Unsafe/);
  fs.symlinkSync('../../../plugins/design-studio', path.join(root, '.agents/skills/distribution'));
  assert.throws(() => packageStarter(root, [...files, '.agents/skills/distribution']), /leaves selected/);
  assert.ok(fs.existsSync(path.join(root, 'plugins/design-studio/plugin.json')));
  assert.equal(fs.readFileSync(path.join(root, 'studio.config.ts'), 'utf8'), 'preserved content');
});

test('packaging preserves build commands and toolchain metadata without rewriting', t => {
  const { root, files } = fixture(t);
  const pkg = {
    scripts: {
      build: 'node custom-build.js && pnpm test',
      'build:release': 'pnpm test:release && pnpm build',
      test: 'node custom-test.js',
    },
    engines: { node: '>=24 <25', pnpm: '>=12 <13' },
    dependencies: { react: '19' },
  };
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
  packageStarter(root, [...files, 'package.json']);
  const packed = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  assert.deepEqual(packed, pkg);
});

test('README template links target retained Studio files rather than plugin files', () => {
  const repo = new URL('../../../../', import.meta.url);
  const template = fs.readFileSync(new URL('plugins/design-studio/scripts/starter-readme.md', repo), 'utf8');
  for (const match of template.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) continue;
    assert.ok(starterIncludes(target), 'Template reference must be retained: ' + target);
    assert.ok(fs.existsSync(new URL(target, repo)), 'Template reference must exist: ' + target);
  }
});
