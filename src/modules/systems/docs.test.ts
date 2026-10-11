// How a system's components and their docs are worked out (systemDocs.ts and
// src/modules/systems/node/docs.js). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  componentProblems,
  conciseDescription,
  discoverComponents,
  duplicateProblems,
  exampleNames,
  type ComponentPropsDoc,
} from './docs.ts';
import { systemDocs } from './node/docs.js';

const names = (files: string[]) => discoverComponents(files).map(c => c.name);

test('flat files and folders both make components', () => {
  const found = discoverComponents([
    'button.tsx',
    'button.examples.tsx',
    'button.md',
    'dialog/dialog.tsx',
    'dialog/dialog.md',
    'dialog/index.ts',
  ]);
  assert.deepEqual(
    found.map(c => c.name),
    ['button', 'dialog'],
  );
  assert.deepEqual(found[0].files, { source: 'button.tsx', examples: 'button.examples.tsx', doc: 'button.md' });
  assert.deepEqual(found[1].files, { source: 'dialog/dialog.tsx', examples: null, doc: 'dialog/dialog.md' });
});

test('files match by folder and name, ignoring case', () => {
  const [c] = discoverComponents(['Button/Button.tsx', 'Button/button.md']);
  assert.equal(c.name, 'Button');
  assert.equal(c.files.doc, 'Button/button.md');
  // The same name in another folder is another component, not a match.
  assert.equal(discoverComponents(['a/button.tsx', 'b/button.md']).length, 2);
});

test('several components can share a folder', () => {
  assert.deepEqual(names(['Button/Button.tsx', 'Button/IconButton.tsx', 'Button/IconButton.md']), [
    'Button',
    'IconButton',
  ]);
});

test("a component's page is its name in kebab-case", () => {
  assert.deepEqual(
    discoverComponents(['IconButton.tsx', 'button.tsx']).map(c => c.slug),
    ['button', 'icon-button'],
  );
});

test('helpers, tests, stories, and READMEs are not components', () => {
  assert.deepEqual(
    names([
      'index.ts',
      'a/index.tsx',
      '_util.tsx',
      '.hidden.tsx',
      'button.test.tsx',
      'button.stories.tsx',
      'types.d.ts',
      'README.md',
      'lib.ts',
    ]),
    [],
  );
});

test('a system whose components come from a package can hold only docs', () => {
  const [c] = discoverComponents(['card.md', 'card.examples.tsx']);
  assert.deepEqual(c.files, { source: null, examples: 'card.examples.tsx', doc: 'card.md' });
});

test('examples are the exports named with a capital', () => {
  const source =
    'export const Primary = () => null;\nexport function WithIcon() {}\nexport const meta = {};\nconst Hidden = 1;\nexport default Primary;\n';
  assert.deepEqual(exampleNames(source), ['Primary', 'WithIcon']);
  assert.deepEqual(exampleNames('export const meta = {};'), []);
});

const good = {
  frontmatter: { title: 'Button', description: 'Starts an action.' },
  body: '## When to use\n\nFor actions.\n',
};
const button = (files: Partial<ReturnType<typeof discoverComponents>[number]['files']> = {}) => ({
  name: 'button',
  slug: 'button',
  files: { source: 'button.tsx', examples: 'button.examples.tsx', doc: 'button.md', ...files },
});

test('a complete component has no problems', () => {
  assert.deepEqual(componentProblems(button(), { doc: good, examples: 'export const Primary = () => null;' }), []);
});

test('a component with no companions gets one line, and one missing companion is named', () => {
  const alone = componentProblems(button({ examples: null, doc: null }), { doc: null, examples: null });
  assert.equal(alone.length, 1);
  assert.match(alone[0], /button\.examples\.tsx and button\.md/);
  assert.match(
    componentProblems(button({ doc: null }), { doc: null, examples: 'export const A = 1;' }).join('\n'),
    /no button\.md yet/,
  );
  assert.match(
    componentProblems(button({ examples: null }), { doc: good, examples: null }).join('\n'),
    /no button\.examples\.tsx yet/,
  );
});

test('the doc needs a title, a description, and a When to use section', () => {
  const problems = (doc: typeof good | { frontmatter: null; body: string }) =>
    componentProblems(button(), { doc, examples: 'export const A = () => null;' }).join('\n');
  assert.match(problems({ frontmatter: null, body: '' }), /"title"[\s\S]*"description"[\s\S]*When to use/);
  assert.match(problems({ ...good, frontmatter: { title: 'B', description: '  ' } }), /"description"/);
  assert.match(problems({ ...good, body: '## Usage\n' }), /When to use/);
  // The scaffold's hint comment and code blocks don't count as a section.
  assert.match(problems({ ...good, body: '<!-- ## When to use -->\n```md\n## When to use\n```\n' }), /When to use/);
  assert.equal(problems({ ...good, body: '### when to use\n' }), '');
});

test('an examples file with no examples is a problem', () => {
  assert.match(
    componentProblems(button(), { doc: good, examples: 'export const meta = {};' }).join('\n'),
    /has no examples/,
  );
});

test('two components with one name are reported once', () => {
  const found = discoverComponents(['a/card.tsx', 'b/Card.tsx']);
  const dupes = duplicateProblems(found);
  assert.equal(dupes.length, 1);
  assert.match(dupes[0].problem, /same name/);
});

test('scanning a folder returns manifest entries and problems', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'system-'));
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write('button.tsx', 'export const Button = 1;');
  write(
    'button.md',
    '---\ntitle: Button\ndescription: Starts an action.\ncategory: Actions\ndocs: https://example.com/button\n---\n\n## When to use\n',
  );
  write('button.examples.tsx', 'export const Primary = () => null;');
  write('input.tsx', 'export const Input = 1;');
  write('node_modules/x/y.tsx', 'x');
  write('.hidden/z.tsx', 'x');
  const { components, problems } = systemDocs(root);
  assert.deepEqual(
    components.map(c => c.slug),
    ['button', 'input'],
  );
  assert.equal(components[0].title, 'Button');
  assert.equal(components[0].category, 'Actions');
  // A component with no page is titled by its file name, made readable; a page can link to its docs elsewhere.
  assert.equal(components[1].title, 'Input');
  assert.equal(components[1].docsUrl, null);
  assert.equal(components[0].docsUrl, 'https://example.com/button');
  assert.deepEqual(
    problems.map(p => p.file),
    ['input.tsx'],
  );
  assert.deepEqual(systemDocs(path.join(root, 'missing')), { components: [], problems: [] });
});

test('props resolve imported types, defaults and native attributes independently of example systems', async t => {
  const { extractProps } = await import('./node/extract-props.js');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-props-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.symlinkSync(path.resolve('node_modules'), path.join(root, 'node_modules'));
  fs.writeFileSync(
    path.join(root, 'tsconfig.app.json'),
    JSON.stringify({
      compilerOptions: { jsx: 'react-jsx', moduleResolution: 'bundler', module: 'esnext', strict: true },
    }),
  );
  fs.writeFileSync(path.join(root, 'types.ts'), 'export interface Variants { variant?: "default" | "outline"; }');
  const file = path.join(root, 'components.tsx');
  fs.writeFileSync(
    file,
    `import type { ComponentProps } from 'react';
import type { Variants } from './types';
import { Button as Primitive } from '@base-ui/react/button';
export function Button({ variant = "default", ...props }: Primitive.Props & Variants & { label: string }) { return null; }
export function Input(props: ComponentProps<'input'>) { return null; }
`,
  );
  const result = extractProps([file], root) as Record<string, ComponentPropsDoc[]>;
  const button = result[file].find(c => c.name === 'Button')!;
  assert.equal(button.native, true);
  const variant = button.props.find(p => p.name === 'variant')!;
  assert.equal(variant.default, '"default"');
  assert.match(variant.type, /"outline"/);
  assert.equal(variant.required, false);
  assert.equal(button.props.find(p => p.name === 'label')!.required, true);
  assert.equal(
    button.props.some(p => p.name === 'onClick'),
    false,
  );
  const input = result[file].find(c => c.name === 'Input')!;
  assert.equal(input.native, true);
  assert.deepEqual(input.props, []);
});
test('starter docs files sit next to the component and never break the checks', async () => {
  const { docTemplates, titleOf } = await import('./scaffold.ts');
  assert.equal(titleOf('icon-button'), 'Icon button');
  assert.equal(titleOf('IconButton'), 'Icon button');
  const flat = docTemplates({ system: 'product', source: 'icon-button.tsx' });
  assert.match(
    docTemplates({ system: 'studio', source: 'item.tsx' }).examples.content,
    /from '@\/systems\/studio\/components\/item'/,
  );
  assert.equal(flat.examples.file, 'icon-button.examples.tsx');
  assert.equal(flat.doc.file, 'icon-button.md');
  assert.match(flat.examples.content, /import \{ IconButton \} from '@\/systems\/product\/components\/icon-button'/);
  const folder = docTemplates({
    system: 'product',
    source: 'dialog/dialog.tsx',
    exportName: 'Dialog',
    required: [
      { name: 'label', type: 'string' },
      { name: 'open', type: 'boolean' },
      { name: 'onSelect', type: '() => void' },
    ],
  });
  assert.equal(folder.doc.file, 'dialog/dialog.md');
  assert.match(folder.examples.content, /components\/dialog'/);
  assert.match(folder.examples.content, /<Dialog label="Label" open onSelect=\{undefined as never\} \/>/);
  assert.match(folder.examples.content, /Replace each "undefined as never"/);
  assert.doesNotMatch(flat.examples.content, /Replace each/);
  // The starter page names its "When to use" section, so only the title and description are left to write.
  const [c] = discoverComponents(['icon-button.tsx', flat.examples.file, flat.doc.file]);
  const problems = componentProblems(c, {
    doc: {
      frontmatter: { title: 'Icon button', description: 'x' },
      body: flat.doc.content.replace(/^---[\s\S]*?---\n/, ''),
    },
    examples: flat.examples.content,
  });
  assert.deepEqual(problems, []);
  assert.match(
    componentProblems(c, {
      doc: { frontmatter: { title: 'Icon button', description: '' }, body: '' },
      examples: '',
    }).join('\n'),
    /description/,
  );
});

test('a first heading is the title when the frontmatter has none', async () => {
  const { default: plugin } = await import('../../platform/node/build/remark-title-from-heading.js');
  const h1 = (text: string) => ({ type: 'heading', depth: 1, children: [{ type: 'text', value: text }] });
  const para = { type: 'paragraph', children: [{ type: 'text', value: 'x' }] };
  const run = (children: unknown[]) => {
    const tree = { type: 'root', children };
    plugin()(tree);
    return tree.children as { type: string; value?: string }[];
  };
  // No frontmatter: one is made from the heading, and the heading leaves the body.
  let out = run([h1('Document a "component"'), para]);
  assert.deepEqual(
    out.map(n => n.type),
    ['yaml', 'paragraph'],
  );
  assert.equal(out[0].value, 'title: "Document a \\"component\\""');
  // Frontmatter without a title gets one; with a title is left alone.
  out = run([{ type: 'yaml', value: 'name: a\ndescription: b' }, h1('A'), para]);
  assert.equal(out[0].value, 'name: a\ndescription: b\ntitle: "A"');
  assert.equal(out.length, 2);
  out = run([{ type: 'yaml', value: 'title: Mine' }, h1('A'), para]);
  assert.deepEqual(
    out.map(n => n.type),
    ['yaml', 'heading', 'paragraph'],
  );
  // A SKILL.md with no title and no heading is titled by its name; other files with a name are not.
  const skill = (path: string) => {
    const tree = {
      type: 'root',
      children: [{ type: 'yaml', value: 'name: document-component\ndescription: d' }, para],
    };
    plugin()(tree, { path });
    return tree.children as { type: string; value?: string }[];
  };
  assert.equal(
    skill('/x/skills/document-component/SKILL.md')[0].value,
    'name: document-component\ndescription: d\ntitle: "Document component"',
  );
  assert.equal(skill('/x/notes.md')[0].value, 'name: document-component\ndescription: d');
  // A heading wins over the name.
  const both = { type: 'root', children: [{ type: 'yaml', value: 'name: a-b' }, h1('Mine'), para] };
  plugin()(both, { path: '/x/SKILL.md' });
  assert.match((both.children[0] as { value: string }).value, /title: "Mine"/);
  // Only a heading the file opens with counts, and only level 1.
  assert.deepEqual(
    run([para, h1('A')]).map(n => n.type),
    ['paragraph', 'heading'],
  );
  assert.deepEqual(
    run([{ type: 'heading', depth: 2, children: [{ type: 'text', value: 'A' }] }, para]).map(n => n.type),
    ['heading', 'paragraph'],
  );
});

test('a prop description is its first sentence, short and plain', () => {
  assert.equal(
    conciseDescription('Whether the button is `disabled`. Set it to stop clicks.'),
    'Whether the button is disabled.',
  );
  assert.equal(conciseDescription('  Line one\n continues here.  Then more. '), 'Line one continues here.');
  assert.equal(conciseDescription('No full stop'), 'No full stop');
  assert.equal(conciseDescription('Version 1.5 of the thing is used. Extra.'), 'Version 1.5 of the thing is used.');
  assert.equal(conciseDescription(''), '');
  const long = conciseDescription('word '.repeat(60) + 'end.', 40);
  assert.ok(long.length <= 41 && long.endsWith('…') && !long.includes('  '), long);
});

test("a theme's tokens: scoped light and dark values, sorted into groups", async () => {
  const { themeTokens, KNOWN_COLORS } = await import('./themeTokens.ts');
  const css = `
    /* a comment with { braces } and --fake: red; */
    @import "x.css";
    .brand-theme {
      --background: oklch(1 0 0);
      --primary: #123456;
      --blue-500: rgb(0 0 255);
      --gray-50: hsl(0 0% 98%);
      --text-primary: oklch(0.2 0 0);
      --brand: var(--blue-500);
      --radius: 0.5rem;
      --radius-pill: 999px;
      --shadow-md: 0 1px 2px rgb(0 0 0 / 10%);
      --spacing: 0.25rem;
      --space-4: 1rem;
      --font-sans: 'Inter', sans-serif;
      --text-sm: 0.875rem;
      --font-weight-bold: 700;
      --ease-out: cubic-bezier(0, 0, 0.2, 1);
      --outside: var(--defined-elsewhere);
    }
    .brand-theme[data-color-mode="dark"] { --background: oklch(0.1 0 0); --primary: #abcdef; }
    .other-theme { --nope: red; }
    @media (min-width: 40rem) { .brand-theme { --wide-gap: 2rem; } }
    @theme { --color-accent: var(--primary); --color-primary: var(--primary); --color-teal-600: #008080; }
  `;
  const tokens = themeTokens(css, 'brand-theme');
  const by = Object.fromEntries(tokens.map(t => [t.name, t]));
  const groupOf = (n: string) => by[n]?.group;
  for (const n of [
    '--background',
    '--primary',
    '--blue-500',
    '--gray-50',
    '--text-primary',
    '--brand',
    '--color-accent',
    '--color-teal-600',
  ])
    assert.equal(groupOf(n), 'colors', n);
  assert.equal(groupOf('--radius'), 'radius');
  assert.equal(groupOf('--radius-pill'), 'radius');
  assert.equal(groupOf('--shadow-md'), 'shadows');
  assert.equal(groupOf('--spacing'), 'spacing');
  assert.equal(groupOf('--space-4'), 'spacing');
  for (const n of ['--font-sans', '--text-sm', '--font-weight-bold']) assert.equal(groupOf(n), 'typography', n);
  assert.equal(groupOf('--ease-out'), 'motion');
  assert.equal(groupOf('--wide-gap'), 'other');
  assert.equal(groupOf('--outside'), 'other');
  // What isn't the system's, or isn't a token, isn't listed; an alias of the same color is listed once.
  assert.equal(by['--nope'], undefined);
  assert.equal(by['--fake'], undefined);
  assert.equal(by['--color-primary'], undefined);
  // Light and dark: which have a dark value of their own.
  assert.deepEqual([by['--background'].dark, by['--primary'].dark, by['--blue-500'].dark], [true, true, false]);
  // Colors are grouped: shadcn's by role, ramps by name.
  assert.equal(by['--background'].subgroup, 'Surfaces');
  assert.equal(by['--primary'].subgroup, 'Actions');
  assert.equal(by['--blue-500'].subgroup, 'Blue');
  assert.equal(by['--color-teal-600'].subgroup, 'Teal');
  assert.equal(by['--brand'].subgroup, null);
  assert.equal(by['--radius'].subgroup, null);
  assert.equal(KNOWN_COLORS['primary'].role, 'Primary actions');
  // A theme with nothing under its class has no tokens.
  assert.deepEqual(themeTokens('.x { --a: red }', 'brand-theme'), []);
});

test("a menu's items are grouped: what doesn't apply is dropped, and groups are never merged", async () => {
  const { menuGroups } = await import('../../platform/app/shell/menuGroups.ts');
  // A file's menu, all of it.
  assert.deepEqual(menuGroups([['open', 'reveal', 'link', 'path'], ['start', 'rename'], ['delete']]), [
    ['open', 'reveal', 'link', 'path'],
    ['start', 'rename'],
    ['delete'],
  ]);
  // A folder's: the groups that are left keep their order, and a group of one stays a group.
  assert.deepEqual(menuGroups([['new'], [false, 'reveal', undefined, 'path'], [false, 'rename'], ['delete']]), [
    ['new'],
    ['reveal', 'path'],
    ['rename'],
    ['delete'],
  ]);
  // Empty groups leave no line.
  assert.deepEqual(menuGroups([[false], [], [null, 'link'], [false]]), [['link']]);
  assert.deepEqual(menuGroups([[false], []]), []);
});
