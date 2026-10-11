// The patterns each file type's loader lists its files with (globs.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILE_TYPES } from '../../node/lib/file-types.js';
import { assertUniqueExtensions, systemContentType, matchFileType } from '../fileTypes.ts';
import { globsFor } from './globs.ts';
import { setModuleFolders } from '../roots.ts';
import type { ModuleSpec } from './index.ts';

const types = FILE_TYPES;
// A file type is removable, so a test about one is skipped when it isn't installed.
const needs = (...ids: string[]) => ({ skip: ids.some(id => !types[id]) && 'needs a file type that is not installed' });
// Modules as fixtures, so the test still runs when one is removed.
const module = (id: string, section?: ModuleSpec['section']): ModuleSpec => ({
  optional: false,
  lib: false,
  id,
  label: id,
  version: '0.1.0',
  requires: '0.2.0',
  section,
});
// The supplied modules are found in the supplied root and the team's examples in the team root, where discovery
// registers them (src/platform/node/lib/modules.js).
setModuleFolders([
  ['prototypes', 'src/platform/modules/prototypes'],
  ['documentation', 'src/platform/modules/documentation'],
  ['systems', 'src/platform/modules/systems'],
]);
const examples = module('examples', { key: 'examples', folder: 'src/examples', items: 'prototypes' });
const modules = [
  module('prototypes', { key: 'prototypes', folder: 'src/prototypes', items: 'prototypes', byPerson: true }),
  module('documentation', { key: 'documentation', folder: 'src/platform/modules/documentation/pages' }),
  module('systems', { key: 'systems', folder: 'src/systems' }),
  examples,
];

// Written out, not derived from the registry: the supplied modules in /platform/modules, the team's examples in /modules.
const moduleContentRoots = modules.flatMap(m => {
  const base = m.id === 'examples' ? '/modules' : '/platform/modules';
  return [`${base}/${m.id}/context`, `${base}/${m.id}/skills`];
});

// These are the lists the loaders were written with by hand, before they were worked out from the modules.
const sorted = (list: string[]) => [...list].sort();

test('views are listed in prototypes and examples, skipping helpers', needs('view'), () => {
  assert.deepEqual(
    sorted(globsFor('view', types, modules)),
    sorted([
      '/prototypes/**/*.{tsx,jsx}',
      '!/prototypes/**/_*/**',
      '!/prototypes/**/_*',
      '/examples/**/*.{tsx,jsx}',
      '!/examples/**/_*/**',
      '!/examples/**/_*',
    ]),
  );
});

test('canvases are listed in prototypes and examples, skipping helpers', needs('canvas'), () => {
  assert.deepEqual(
    sorted(globsFor('canvas', types, modules)),
    sorted([
      '/prototypes/**/*.excalidraw',
      '!/prototypes/**/_*/**',
      '!/prototypes/**/_*',
      '/examples/**/*.excalidraw',
      '!/examples/**/_*/**',
      '!/examples/**/_*',
    ]),
  );
});

test('prototype documents stay within prototype-shaped sections', needs('document'), () => {
  assert.deepEqual(
    sorted(globsFor('document', types, modules)),
    sorted([
      '/prototypes/**/*.md',
      '!/prototypes/**/_*/**',
      '!/prototypes/**/_*',
      '/examples/**/*.md',
      '!/examples/**/_*/**',
      '!/examples/**/_*',
    ]),
  );
});

test('the fallback type lists the SystemContent files no other type opens', needs('text', 'systems'), () => {
  assert.deepEqual(
    globsFor('text', types, modules),
    [
      '/platform/systems/*/context',
      '/platform/systems/*/skills',
      '/systems/*/context',
      '/systems/*/skills',
      '/platform/context',
      '/platform/skills',
      ...moduleContentRoots,
    ].flatMap(root => [root + '/**/*', '!' + root + '/**/*.md']),
  );
});

test('without the examples module, nothing looks in /examples', () => {
  const without = modules.filter(m => m !== examples);
  for (const id of Object.keys(types)) assert.ok(!globsFor(id, types, without).some(g => g.includes('/examples/')));
});

test(
  'a new section that holds prototypes is listed by every type that opens prototype files',
  needs('view', 'document', 'text'),
  () => {
    const playbooks: ModuleSpec = {
      optional: false,
      lib: false,
      id: 'playbooks',
      label: 'Playbooks',
      version: '0.1.0',
      requires: '0.2.0',
      section: { key: 'playbooks', folder: 'src/playbooks', items: 'prototypes' },
    };
    assert.ok(globsFor('view', types, [...modules, playbooks]).includes('/playbooks/**/*.{tsx,jsx}'));
    assert.ok(globsFor('document', types, [...modules, playbooks]).includes('!/playbooks/**/_*'));
    assert.ok(!globsFor('text', types, [...modules, playbooks]).some(g => g.startsWith('/playbooks/')));
  },
);

test('an unknown type is named', () => {
  assert.throws(() => globsFor('nope', types, modules), /no "nope" file type/);
});

test('SystemContent Markdown stays readable and validated without prototype Documents', () => {
  const { document: _document, ...withoutDocuments } = types;
  assert.equal(matchFileType(withoutDocuments, 'notes.md'), null);
  assert.equal(systemContentType(withoutDocuments, 'notes.md'), 'systems');
  assert.equal(systemContentType(withoutDocuments, 'support.js'), 'text');
  assert.deepEqual(
    globsFor('systems', withoutDocuments, modules),
    [
      '/platform/systems/*/context',
      '/platform/systems/*/skills',
      '/systems/*/context',
      '/systems/*/skills',
      '/platform/context',
      '/platform/skills',
      ...moduleContentRoots,
    ].map(root => root + '/**/*.md'),
  );
  assert.deepEqual(
    globsFor('text', withoutDocuments, modules),
    [
      '/platform/systems/*/context',
      '/platform/systems/*/skills',
      '/systems/*/context',
      '/systems/*/skills',
      '/platform/context',
      '/platform/skills',
      ...moduleContentRoots,
    ].flatMap(root => [root + '/**/*', '!' + root + '/**/*.md']),
  );
  assert.match(withoutDocuments.systems.template!('team-context.md'), /title: Team Context/);
  assert.ok(withoutDocuments.systems.check!({ source: '---\ntitle: Unclosed', frontmatter: null }).length);
});

test('extension ownership is unique within each content scope', () => {
  assert.doesNotThrow(() => assertUniqueExtensions(types));
  const type = {
    capabilities: { source: false, create: false, fidelity: false, embeds: [], actions: [] },
    inPrototype: true,
    inSystemContent: false,
    fallback: false,
    extensions: ['.md'],
    label: 'Document',
  };
  assert.throws(
    () => assertUniqueExtensions({ document: type, other: { ...type, label: 'Other' } }),
    /both use .md in prototype/,
  );
  assert.throws(
    () =>
      assertUniqueExtensions({
        shared: { ...type, inPrototype: false, inSystemContent: true },
        other: { ...type, inPrototype: false, inSystemContent: true },
      }),
    /both use .md in systemContent/,
  );
});

test('file types cannot gain a scope or capabilities by omission', async () => {
  const { defineFileType } = await import('../fileTypes.ts');
  const spec = {
    label: 'Fixture',
    extensions: ['.fixture'],
    capabilities: { source: false, create: false, fidelity: false, embeds: [], actions: [] },
    inPrototype: false,
    inSystemContent: false,
    fallback: false,
  };
  for (const field of ['capabilities', 'inPrototype', 'inSystemContent', 'fallback']) {
    const incomplete = { ...spec };
    delete (incomplete as Record<string, unknown>)[field];
    assert.throws(() => defineFileType(incomplete), new RegExp(field));
  }
  assert.equal(matchFileType({ fixture: spec }, 'file.fixture'), null);
});

test('a module lists its context and skills from the root it is in', needs('text'), () => {
  const globs = globsFor('text', types, modules);
  for (const root of [
    '/platform/modules/prototypes',
    '/platform/modules/documentation',
    '/platform/modules/systems',
    '/modules/examples',
  ])
    for (const folder of ['context', 'skills']) assert.ok(globs.includes(`${root}/${folder}/**/*`), root);
  assert.ok(!globs.includes('/modules/systems/context/**/*'));
  assert.ok(!globs.includes('/platform/modules/examples/context/**/*'));
});
