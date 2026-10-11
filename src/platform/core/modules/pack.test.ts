// Adding a module from a source (pack.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agentsBlock,
  applyAgentsBlock,
  licenseVerdict,
  packPlan,
  parseSource,
  plainPath,
  readDeclaration,
} from './pack.ts';
import { setModuleFolders } from '../roots.ts';

test('a source is a folder, a git address, or an https tarball', () => {
  assert.deepEqual(parseSource('../my-module'), { kind: 'path', path: '../my-module' });
  assert.deepEqual(parseSource('/Users/me/dialkit'), { kind: 'path', path: '/Users/me/dialkit' });
  assert.deepEqual(parseSource('https://github.com/acme/studio-quote'), {
    kind: 'git',
    url: 'https://github.com/acme/studio-quote',
  });
  assert.deepEqual(parseSource('https://github.com/acme/studio-quote#v1.2.0'), {
    kind: 'git',
    url: 'https://github.com/acme/studio-quote',
    ref: 'v1.2.0',
  });
  assert.deepEqual(parseSource('git@github.com:acme/studio-quote.git'), {
    kind: 'git',
    url: 'git@github.com:acme/studio-quote.git',
  });
  assert.deepEqual(parseSource('https://example.com/quote-1.0.0.tar.gz'), {
    kind: 'tarball',
    url: 'https://example.com/quote-1.0.0.tar.gz',
  });
});

test('http, file, git:// and other schemes are refused, and so is anything that could be a flag', () => {
  assert.match((parseSource('http://example.com/x.tar.gz') as { error: string }).error, /https/);
  assert.match((parseSource('file:///etc') as { error: string }).error, /aren't supported/);
  assert.match((parseSource('ext::sh -c touch% /tmp/x') as { error: string }).error, /isn't a folder or an address/);
  assert.match((parseSource('https://github.com/a/b c') as { error: string }).error, /isn't a folder or an address/);
  assert.match((parseSource('git://example.com/x') as { error: string }).error, /aren't supported/);
  assert.match((parseSource('--upload-pack=evil') as { error: string }).error, /isn't a folder or an address/);
  assert.match((parseSource('') as { error: string }).error, /Say where/);
});

test('a folder with spaces in its name is fine', () => {
  assert.deepEqual(parseSource('/Users/me/My Modules/quote'), { kind: 'path', path: '/Users/me/My Modules/quote' });
  assert.deepEqual(parseSource('C:\\Users\\me\\quote'), { kind: 'path', path: 'C:\\Users\\me\\quote' });
});

test('a ref has to look like a branch, tag or commit', () => {
  assert.match((parseSource('https://github.com/a/b#--evil') as { error: string }).error, /isn't a branch/);
  assert.match((parseSource('https://github.com/a/b#a b') as { error: string }).error, /isn't a branch/);
  assert.match((parseSource('./folder#main') as { error: string }).error, /no #ref/);
});

test('paths in a pack must be plain', () => {
  assert.equal(plainPath('app.tsx'), true);
  assert.equal(plainPath('lib/index.ts'), true);
  for (const bad of ['../x', '/x', 'a/../b', 'a//b', 'a\\b', './a', '', 'a/\0b'])
    assert.equal(plainPath(bad), false, bad);
});

const spec = {
  id: 'quote',
  section: { key: 'quote', folder: 'src/quote' },
  instructions: [{ path: 'context/quote.md', when: 'wants a quote' }, { path: 'skills/quote-tour/' }],
};

test('a module pack goes to its folder, with systemContent files and content sent where they belong', () => {
  const plan = packPlan('module', 'quote', spec, [
    'module.ts',
    'app.tsx',
    'lib/index.ts',
    'instructions/context/quote.md',
    'instructions/skills/quote-tour/SKILL.md',
    'content/sample/meta.json',
  ]);
  assert.deepEqual(plan.problems, []);
  assert.deepEqual(
    plan.moves.map(m => m.to),
    [
      'src/modules/quote/module.ts',
      'src/modules/quote/app.tsx',
      'src/modules/quote/lib/index.ts',
      'src/modules/quote/context/quote.md',
      'src/modules/quote/skills/quote-tour/SKILL.md',
      'src/quote/sample/meta.json',
    ],
  );
});

test('a pack never goes to the supplied root, even for a supplied id', () => {
  const plan = packPlan('module', 'canvas', { id: 'canvas' }, ['module.ts', 'lib/index.ts']);
  assert.deepEqual(
    plan.moves.map(m => m.to),
    ['src/modules/canvas/module.ts', 'src/modules/canvas/lib/index.ts'],
  );
});

test('systemContent files the module did not list, or listed but did not bring, are named', () => {
  assert.match(
    packPlan('module', 'quote', spec, ['module.ts', 'instructions/context/other.md']).problems.join('\n'),
    /instructions\/context\/other\.md isn't listed/,
  );
  assert.match(
    packPlan('module', 'quote', spec, ['module.ts']).problems.join('\n'),
    /lists instructions\/context\/quote\.md, which isn't in the pack/,
  );
});

test('content needs a section, and hidden files and dependencies stay behind', () => {
  assert.match(
    packPlan('module', 'x', { id: 'x' }, ['module.ts', 'content/a.md']).problems.join('\n'),
    /nowhere for content/,
  );
  const plan = packPlan('module', 'x', { id: 'x' }, [
    'module.ts',
    '.DS_Store',
    '.git/config',
    'node_modules/a/index.js',
    '.env',
  ]);
  assert.deepEqual(
    plan.moves.map(m => m.to),
    ['src/modules/x/module.ts'],
  );
  assert.equal(plan.skipped.length, 4);
});

test('a path that climbs out of the pack is a problem, never a move', () => {
  const plan = packPlan('module', 'x', { id: 'x' }, ['module.ts', '../../etc/passwd', '/abs']);
  assert.equal(plan.moves.length, 1);
  assert.equal(plan.problems.length, 2);
});

test('a design system pack goes to src/systems', () => {
  const plan = packPlan('system', 'brand', undefined, ['system.ts', 'styles/theme.css', 'components/button.tsx']);
  assert.deepEqual(
    plan.moves.map(m => m.to),
    ['src/systems/brand/system.ts', 'src/systems/brand/styles/theme.css', 'src/systems/brand/components/button.tsx'],
  );
});

test('a library needs a license file and a permissive license', () => {
  const up = (license: string) => ({ upstream: { repo: 'https://github.com/a/b', version: '1.0.0', license } });
  assert.equal(licenseVerdict({}, false), 'not-applicable');
  assert.equal(licenseVerdict(up('MIT'), true), 'ok');
  assert.equal(licenseVerdict(up('MIT'), false), 'none');
  assert.equal(licenseVerdict(up('none'), true), 'none');
  assert.equal(licenseVerdict(up('GPL-3.0-only'), true), 'not-permissive');
});

test('the AGENTS.md lines come from the modules that are on, and replace themselves', () => {
  const block = agentsBlock([spec, { id: 'plain' }]);
  assert.match(
    block,
    /When the person wants a quote, read \[src\/modules\/quote\/context\/quote\.md\]\(src\/modules\/quote\/context\/quote\.md\)\./,
  );
  assert.ok(!block.includes('quote-tour'), 'a systemContent entry with no "when" is not routed');
  const agents = '# A\n\nWhen the person asks for a canvas, read x.\nFind out who.\n';
  const once = applyAgentsBlock(agents, block);
  assert.match(once, /canvas, read x\.\n<!-- studio:modules -->\nWhen the person wants a quote/);
  const twice = applyAgentsBlock(once, agentsBlock([]));
  assert.ok(!twice.includes('wants a quote'));
  assert.equal(applyAgentsBlock(twice, agentsBlock([])), twice);
  assert.match(applyAgentsBlock('# only\n', block), /<!-- studio:modules -->/);
});

test('the AGENTS.md lines point at each module in the root that holds it', () => {
  const supplied = {
    id: 'canvas',
    instructions: [{ path: 'skills/use-canvas/', when: 'asks for a canvas' }],
  };
  setModuleFolders([
    ['canvas', 'src/platform/modules/canvas/'],
    ['quote', 'src/modules/quote/'],
  ]);
  try {
    const block = agentsBlock([supplied, spec]);
    assert.match(
      block,
      /When the person asks for a canvas, read \[src\/platform\/modules\/canvas\/skills\/use-canvas\/SKILL\.md\]\(src\/platform\/modules\/canvas\/skills\/use-canvas\/SKILL\.md\)\./,
    );
    assert.match(
      block,
      /read \[src\/modules\/quote\/context\/quote\.md\]\(src\/modules\/quote\/context\/quote\.md\)\./,
    );
  } finally {
    setModuleFolders([]);
  }
});

test('a declaration is read as plain data, comments and types ignored', () => {
  const r = readDeclaration(`import type { ModuleSpec } from './index.ts';

// A module.
export default {
  id: 'quote', /* the folder */
  label: "Quote's card",
  version: '0.1.0',
  optional: true,
  section: { key: 'quote', folder: 'src/quote', items: 'prototypes' },
  instructions: [{ path: 'context/quote.md', when: 'wants a quote' },],
  dependencies: { 'left-pad': '^1.0.0' },
} satisfies ModuleSpec;
`);
  assert.deepEqual(r, {
    value: {
      id: 'quote',
      label: "Quote's card",
      version: '0.1.0',
      optional: true,
      section: { key: 'quote', folder: 'src/quote', items: 'prototypes' },
      instructions: [{ path: 'context/quote.md', when: 'wants a quote' }],
      dependencies: { 'left-pad': '^1.0.0' },
    },
  });
});

test('a declaration that needs code is refused, never run', () => {
  const refused = (text: string) => assert.ok('error' in readDeclaration(text), text);
  refused('export default { id: process.exit(1) };');
  refused("export default { id: 'a', x: globalThis.process.getBuiltinModule('fs') };");
  refused('export default { id: `a${1}` };');
  refused('export default { id: someName };');
  refused('export default { ...other };');
  refused('export default { __proto__: { a: 1 } };');
  refused("const x = 1; export default { id: 'a' }; console.log(x);");
  refused("export default { id: 'a' }; fetch('x');");
  refused('export default 5;');
  refused('export default [1];');
  refused("export default { id: 'a'");
  refused("module.exports = { id: 'a' };");
});

test('a comment marker inside text is text', () => {
  assert.deepEqual(
    readDeclaration('export default { label: \'See https://x.y // not a comment\', note: "a /* b */ c" };'),
    { value: { label: 'See https://x.y // not a comment', note: 'a /* b */ c' } },
  );
});

test('duplicate declaration keys cannot hide identity or authority changes', () => {
  for (const source of [
    "export default { studioId: '0123456789abcdef', 'studioId': 'abcdefghjkmnpqrs' };",
    "export default { admins: ['pat'], admins: ['other'] };",
    "export default { systemMaintainers: { product: ['pat'], 'product': ['other'] } };",
    "export default { studioId: '0123456789abcdef', '\\u0073tudioId': 'abcdefghjkmnpqrs' };",
  ]) {
    const result = readDeclaration(source);
    assert.ok('error' in result);
    assert.match(result.error, /declared more than once/);
  }
});
