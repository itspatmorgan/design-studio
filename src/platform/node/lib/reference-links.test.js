import assert from 'node:assert/strict';
import test from 'node:test';
import { markdownPath, migratedGuidancePath } from '../../app/docs/referenceLinks.ts';
import globs, { archivedSystemGlobs, withSystemNegations } from '../build/vite-globs-plugin.js';
import { ENABLED_MODULES } from './modules.js';
import titleFromHeading from '../build/remark-title-from-heading.js';

test('owner README and relative context links use the same browser', () => {
  const resolve = (href, base) => markdownPath(new URL(href, `http://doc${base}/`).pathname);
  // A module is addressed by its id wherever its folder is: the supplied root, the team's, or a saved link from before
  // the supplied modules moved to src/platform/modules.
  assert.equal(
    resolve('../../../../platform/modules/systems/README.md', '/systems/studio/context'),
    '/documentation/context/module.systems',
  );
  assert.equal(
    resolve('../../../../modules/systems/README.md', '/systems/studio/context'),
    '/documentation/context/module.systems',
  );
  assert.equal(
    resolve('../../../../modules/research/README.md', '/systems/studio/context'),
    '/documentation/context/module.research',
  );
  assert.equal(resolve('README.md', '/platform/modules/systems'), '/documentation/context/module.systems');
  assert.equal(resolve('README.md', '/modules/research'), '/documentation/context/module.research');
  assert.equal(
    resolve('../../systems/studio/context/writing.md', '/platform/modules/systems'),
    '/systems/studio/context/writing',
  );
  assert.equal(
    resolve('../../systems/product/context/writing.md', '/modules/research'),
    '/systems/product/context/writing',
  );
  // Studio's own system is in the supplied root but is addressed like any system.
  assert.equal(
    resolve('../../platform/systems/studio/context/writing.md', '/modules/research'),
    '/systems/studio/context/writing',
  );
  assert.equal(resolve('../../platform/systems/studio/README.md', '/modules/research'), '/systems/studio');
  assert.equal(resolve('./main.tsx', '/prototypes/patrick/example'), '/prototypes/patrick/example/main.tsx');
  assert.equal(markdownPath('/platform/modules/documentation/pages/prototypes.md'), '/documentation/manual/prototypes');
  assert.equal(markdownPath('/platform/modules/documentation/pages/index.md'), '/documentation/manual');
  assert.equal(markdownPath('/modules/documentation/pages/prototypes.md'), '/documentation/manual/prototypes');
  assert.equal(markdownPath('/platform/modules/README.md'), '/documentation/context/platform.core/context/modules');
  assert.equal(markdownPath('/modules/README.md'), '/documentation/context/platform.core/context/modules');
  assert.equal(markdownPath('/systems/product/README.md'), '/systems/product');
  assert.equal(markdownPath('/platform/README.md'), '/documentation/context/platform.core');
});

test('overview discovery uses original owner READMEs and enabled module documents', () => {
  const result = globs().transform(
    "const pages = import.meta.glob(['/__studio_references__/*'])",
    '/src/platform/app/docs/loadReference.ts',
  );
  assert.ok(result);
  const patterns = JSON.parse(result.code.slice('const pages = import.meta.glob('.length, -1));
  assert.deepEqual(patterns, ['/platform/README.md', ...ENABLED_MODULES.map(m => `/platform/modules/${m.id}/*.md`)]);
});

test('contracts render every section and extract only the opening title', () => {
  const heading = (depth, value) => ({ type: 'heading', depth, children: [{ type: 'text', value }] });
  const sections = [
    heading(2, 'For developers'),
    { type: 'paragraph', children: [{ type: 'text', value: 'Contract' }] },
  ];
  const tree = { children: [heading(1, 'System contract'), ...sections] };
  titleFromHeading()(tree, { basename: 'README.md' });
  assert.equal(tree.children[0].type, 'yaml');
  assert.deepEqual(tree.children.slice(1), sections);
});

test('frontmatter titles suppress only a matching opening H1', () => {
  for (const value of [
    'title: Studio configuration',
    'title: "Studio configuration"',
    "title: 'Studio configuration'",
    'title: >\n  Studio configuration',
  ]) {
    const yaml = { type: 'yaml', value };
    const section = { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Settings' }] };
    const tree = {
      children: [
        yaml,
        {
          type: 'heading',
          depth: 1,
          children: [
            { type: 'text', value: 'Studio ' },
            { type: 'emphasis', children: [{ type: 'text', value: 'configuration' }] },
          ],
        },
        section,
      ],
    };
    titleFromHeading()(tree, { basename: 'config.md' });
    assert.deepEqual(tree.children, [yaml, section]);
  }
});

test('frontmatter titles preserve differing and non-opening headings', () => {
  const yaml = { type: 'yaml', value: 'title: Overview' };
  const heading = { type: 'heading', depth: 1, children: [{ type: 'text', value: 'Details' }] };
  const paragraph = { type: 'paragraph', children: [{ type: 'text', value: 'Introduction' }] };
  for (const body of [[heading], [paragraph, { ...heading, children: [{ type: 'text', value: 'Overview' }] }]]) {
    const tree = { children: [yaml, ...body] };
    titleFromHeading()(tree, { basename: 'example.md' });
    assert.deepEqual(tree.children, [yaml, ...body]);
  }
});

test('skill names supply task titles when no heading is present', () => {
  const tree = {
    children: [
      { type: 'yaml', value: 'name: use-canvas\ndescription: Create a canvas.' },
      { type: 'paragraph', children: [{ type: 'text', value: 'Instructions' }] },
    ],
  };
  titleFromHeading()(tree, { basename: 'SKILL.md' });
  assert.match(tree.children[0].value, /title: "Use canvas"/);
  assert.equal(tree.children[1].type, 'paragraph');
});

test('technical context and skill source links resolve without a duplicate Reference reader', () => {
  assert.equal(markdownPath('/platform/context/personas.md'), '/documentation/context/platform.core/context/personas');
  assert.equal(
    markdownPath('/platform/context/file-types.md'),
    '/documentation/context/platform.core/context/file-types',
  );
  assert.equal(
    markdownPath('/platform/modules/prototypes/skills/build-prototype/SKILL.md'),
    '/documentation/context/module.prototypes/skills/build-prototype/SKILL',
  );
});

test('saved Reference, Knowledge, and system guidance links follow both migrations', () => {
  const cases = {
    '/documentation/context/platform.core/context/technical/config':
      '/documentation/context/platform.core/context/config',
    '/documentation/reference/platform/context/technical/file-types.md':
      '/documentation/context/platform.core/context/file-types',
    '/platform/context/technical/agent-context.md': '/documentation/context/platform.core/context/agent-context',
    '/systems/studio/rules/prototype-workflow': '/documentation/context/module.prototypes/skills/build-prototype/SKILL',
    '/systems/studio/context/principles.md': '/documentation/context/platform.core/context/principles',
    '/systems/studio/skills/setup-design-system/SKILL.md':
      '/documentation/context/module.systems/skills/setup-design-system/SKILL',
    '/documentation/reference/modules/systems/reference.md': '/documentation/context/module.systems',
    '/documentation/reference/platform/core/fileTypes.md': '/documentation/context/platform.core/context/file-types',
    '/documentation/reference/modules/README.md': '/documentation/context/platform.core/context/modules',
    '/documentation/reference/platform/modules/systems/reference.md': '/documentation/context/module.systems',
    '/documentation/reference/platform/modules/README.md': '/documentation/context/platform.core/context/modules',
    '/documentation/reference': '/documentation/context/platform.core',
    '/knowledge/platform.core/context/personas': '/documentation/context/platform.core/context/personas',
    '/documentation/context/product/context/accessibility': '/systems/product/context/accessibility',
    '/documentation/context/marketing/skills/review/SKILL': '/systems/marketing/skills/review/SKILL',
    '/knowledge/studio/context/writing': '/systems/studio/context/writing',
  };
  for (const [from, to] of Object.entries(cases)) assert.equal(migratedGuidancePath(from), to, from);
  assert.equal(migratedGuidancePath('/documentation/context/platform.core/context/personas'), null);
  assert.equal(migratedGuidancePath('/systems/product/context/accessibility'), null);
});

test('archived systems are left out of the build in whichever root they are in', () => {
  const specs = {
    studio: { status: 'active', dir: 'src/platform/systems/studio/' },
    old: { status: 'archived', dir: 'src/systems/old/' },
    older: { status: 'archived', dir: 'src/platform/systems/older/' },
  };
  assert.deepEqual(archivedSystemGlobs(specs), ['!/systems/old/**', '!/platform/systems/older/**']);
  const negations = archivedSystemGlobs(specs);
  assert.equal(
    withSystemNegations(
      "import.meta.glob<string>(['/platform/systems/*/intro.tsx', '/systems/*/intro.tsx'], { eager: true })",
      negations,
    ),
    'import.meta.glob<string>([\'/platform/systems/*/intro.tsx\', \'/systems/*/intro.tsx\',"!/systems/old/**","!/platform/systems/older/**"], { eager: true })',
  );
  const unrelated = "import.meta.glob('/modules/*/module.ts')";
  assert.equal(withSystemNegations(unrelated, negations), unrelated);
  assert.equal(
    withSystemNegations("import.meta.glob('/systems/*/system.ts')", []),
    "import.meta.glob('/systems/*/system.ts')",
  );
});
