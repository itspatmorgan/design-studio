// What a design system's system.ts may say (systems.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { platformSystemId, systemProblems, systemColorMode, type SystemSpec } from './spec.ts';

const product: SystemSpec = {
  status: 'active',
  role: 'prototype',
  styling: 'tailwind',
  colorModes: ['light', 'dark'],
  label: 'Product',
  themeClass: 'product-theme',
  docs: 'warn',
  origin: 'shadcn',
  libraries: [],
};

test('a well formed system has no problems', () => {
  assert.deepEqual(systemProblems(product, 'product'), []);
  assert.deepEqual(
    systemProblems({ ...product, label: 'Brand', themeClass: 'brand-theme', origin: null }, 'brand'),
    [],
  );
});

test('declared system identity is strict while legacy systems await explicit migration', () => {
  assert.deepEqual(systemProblems({ ...product, studioId: '0123456789abcdef' }, 'product'), []);
  assert.match(systemProblems({ ...product, studioId: 'product' }, 'product').join(' '), /exactly 16/);
  assert.match(systemProblems({ ...product, studioId: null }, 'product').join(' '), /exactly 16/);
});

test('a label and a theme class are required', () => {
  assert.match(systemProblems({ ...product, label: ' ' }, 'product')[0], /add a label/);
  assert.match(
    systemProblems({ ...product, themeClass: 'Product Theme' }, 'product')[0],
    /themeClass should be a CSS class name like "product-theme"/,
  );
});

test('docs and origin take only the values the build understands', () => {
  assert.match(systemProblems({ ...product, docs: 'loud' as 'warn' }, 'product')[0], /docs should be/);
  assert.match(systemProblems({ ...product, origin: 'radix' as 'shadcn' }, 'product')[0], /origin should be 'shadcn'/);
});

test('the folder is the id: lowercase', () => {
  assert.match(systemProblems(product, 'Product')[0], /lowercase letters/);
});

test('anything that is not an object is not a system', () => {
  assert.match(systemProblems(undefined, 'product')[0], /must export a system/);
});

test('systems declare supported modes and safely resolve a global mode', () => {
  assert.equal(systemColorMode(product.colorModes, 'dark'), 'dark');
  assert.equal(systemColorMode(product.colorModes, 'light'), 'light');
  assert.equal(systemColorMode(['light'], 'dark'), 'light');
  assert.equal(systemColorMode(['dark'], 'light'), 'dark');
  assert.equal(systemColorMode(['light', 'dark'], 'dark'), 'dark');
  assert.equal(systemColorMode(['light', 'dark'], 'light'), 'light');
  for (const colorModes of [[], ['light', 'light'], ['automatic'], 'light']) {
    assert.match(systemProblems({ ...product, colorModes }, 'product').join(' '), /colorModes must/);
  }
  assert.deepEqual(systemProblems({ ...product, colorModes: ['dark'] }, 'product'), []);
});

test('the application system is resolved by role, not its folder name', () => {
  const studio = { ...product, role: 'platform' as const, themeClass: 'studio-theme' };
  assert.deepEqual(systemProblems(studio, 'custom-studio'), []);
  assert.equal(platformSystemId({ product, 'custom-studio': studio }), 'custom-studio');
  assert.throws(() => platformSystemId({ product }), /Exactly one/);
  assert.throws(() => platformSystemId({ studio, duplicate: studio }), /Exactly one/);
});

test('system policy fields cannot be inferred from omission', () => {
  for (const field of ['status', 'role', 'styling', 'colorModes', 'docs', 'origin', 'libraries']) {
    const spec = { ...product };
    delete (spec as Record<string, unknown>)[field];
    assert.ok(
      systemProblems(spec, 'product').some(problem => problem.includes(field)),
      field,
    );
  }
});

test('public libraries require clear metadata and bounded entry paths', () => {
  const library = {
    kind: 'package',
    id: 'charts',
    label: 'Charts',
    package: 'recharts',
    description: 'Charts',
    entry: 'libraries/charts.ts',
    docs: 'https://example.test',
    components: ['chart'],
  };
  assert.deepEqual(systemProblems({ ...product, libraries: [library] }, 'product'), []);
  for (const invalid of [
    { entry: '../charts.ts' },
    { package: 'recharts/private' },
    { docs: 'javascript:alert(1)' },
    { label: '' },
    { id: 'Bad Name' },
    { components: ['../chart'] },
  ])
    assert.ok(systemProblems({ ...product, libraries: [{ ...library, ...invalid }] }, 'product').length);
  assert.ok(systemProblems({ ...product, libraries: [library, library] }, 'product').length);
});

test('library inventory distinguishes curated sources from installed packages and optional public APIs', () => {
  const source = {
    kind: 'source',
    id: 'shadcn',
    label: 'shadcn/ui',
    description: 'Curated components',
    docs: 'https://ui.shadcn.com/docs',
  };
  const icons = {
    kind: 'package',
    id: 'lucide',
    label: 'Lucide',
    package: 'lucide-react',
    description: 'Interface icons',
    docs: 'https://lucide.dev/icons/',
    assets: ['icons'],
  };
  assert.deepEqual(systemProblems({ ...product, libraries: [source, icons] }, 'product'), []);
  for (const invalid of [{ kind: undefined }, { package: 'shadcn' }, { entry: 'libraries/shadcn.ts' }, { version: '' }])
    assert.ok(systemProblems({ ...product, libraries: [{ ...source, ...invalid }] }, 'product').length);
  for (const invalid of [{ version: '1.0.0' }, { assets: ['other'] }, { package: undefined }])
    assert.ok(systemProblems({ ...product, libraries: [{ ...icons, ...invalid }] }, 'product').length);
});
