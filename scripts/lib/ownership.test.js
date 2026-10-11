import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classify, mapProblems, ownershipReport, tierOf, trackedFiles } from './ownership.js';

const map = {
  schema: 1,
  rules: [
    { tier: 'upstream', paths: ['src/platform/**', 'src/modules/canvas/**'] },
    { tier: 'team', paths: ['src/modules/**'] },
    { tier: 'seed', paths: ['src/prototypes/patrick/**'] },
    { tier: 'team', paths: ['src/prototypes/**'] },
  ],
  mixed: [{ paths: ['AGENTS.md'], reason: 'Generated block.' }],
};

test('a clean map covers every file, preferring the most specific rule', () => {
  const r = classify(map, [
    'src/platform/a.ts',
    'src/modules/canvas/x.ts',
    'src/modules/mine/x.ts',
    'src/prototypes/patrick/a.tsx',
    'src/prototypes/sam/a.tsx',
    'AGENTS.md',
  ]);
  assert.deepEqual([r.unknown, r.conflicts, r.mixed], [[], [], ['AGENTS.md']]);
  assert.deepEqual(r.tiers, { upstream: 2, generated: 0, seed: 1, team: 2 });
});

test('one path resolves to its tier, mixed, or unknown', () => {
  assert.deepEqual(
    ['src/modules/canvas/x.ts', 'src/modules/mine/x.ts', 'src/prototypes/patrick/a.tsx', 'AGENTS.md', 'notes.txt'].map(
      file => tierOf(map, file),
    ),
    ['upstream', 'team', 'seed', 'mixed', 'unknown'],
  );
});

test('a path no rule matches is unknown', () => {
  assert.deepEqual(classify(map, ['stray.txt', 'src/platform/a.ts']).unknown, ['stray.txt']);
});

test('equally specific rules of different tiers conflict', () => {
  const r = classify(
    {
      schema: 1,
      rules: [
        { tier: 'upstream', paths: ['docs/*.md'] },
        { tier: 'seed', paths: ['docs/*.md'] },
      ],
    },
    ['docs/a.md'],
  );
  assert.deepEqual(r.conflicts, [
    { path: 'docs/a.md', tiers: ['upstream', 'seed'], globs: ['docs/*.md', 'docs/*.md'] },
  ]);
});

test('malformed maps are reported', () => {
  assert.equal(mapProblems(map).length, 0);
  assert.equal(mapProblems({ schema: 2, rules: [] }).length, 1);
  assert.equal(mapProblems({ schema: 1, rules: [{ tier: 'mine', paths: [] }], mixed: [{ paths: ['a'] }] }).length, 3);
});

test('the report reads the map from a root and tracked files from an injected list', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-'));
  fs.mkdirSync(path.join(root, '.studio'));
  fs.writeFileSync(path.join(root, '.studio/ownership.json'), JSON.stringify(map));
  const r = ownershipReport(root, ['AGENTS.md', 'src/platform/a.ts', 'other.md']);
  assert.deepEqual([r.files, r.unknown, r.conflicts.length], [3, ['other.md'], 0]);
  fs.rmSync(root, { recursive: true });
});

test('the repository map has no unknown or conflicting tracked paths', () => {
  const root = path.resolve(import.meta.dirname, '../..'),
    r = ownershipReport(root, trackedFiles(root));
  assert.deepEqual([r.problems, r.unknown, r.conflicts], [[], [], []]);
});
