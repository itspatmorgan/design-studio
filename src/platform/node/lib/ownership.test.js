import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { ownershipFails, printOwnership } from '../check/check-ownership.js';
import { classify, mapProblems, ownershipReport, tierOf, trackedFiles } from './ownership.js';

const map = {
  schema: 1,
  rules: [
    { tier: 'upstream', paths: ['src/platform/**', 'src/platform/modules/canvas/**'] },
    { tier: 'team', paths: ['src/modules/**'] },
    { tier: 'seed', paths: ['src/prototypes/samples/**'] },
    { tier: 'team', paths: ['src/prototypes/**'] },
  ],
  mixed: [{ paths: ['AGENTS.md'], reason: 'Generated block.' }],
};

test('a clean map covers every file, preferring the most specific rule', () => {
  const r = classify(map, [
    'src/platform/a.ts',
    'src/platform/modules/canvas/x.ts',
    'src/modules/mine/x.ts',
    'src/prototypes/samples/a.tsx',
    'src/prototypes/sam/a.tsx',
    'AGENTS.md',
  ]);
  assert.deepEqual([r.unknown, r.conflicts, r.mixed], [[], [], ['AGENTS.md']]);
  assert.deepEqual(r.tiers, { upstream: 2, generated: 0, seed: 1, team: 2 });
});

test('one path resolves to its tier, mixed, or unknown', () => {
  assert.deepEqual(
    [
      'src/platform/modules/canvas/x.ts',
      'src/modules/mine/x.ts',
      'src/prototypes/samples/a.tsx',
      'AGENTS.md',
      'notes.txt',
    ].map(file => tierOf(map, file)),
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
  const root = path.resolve(import.meta.dirname, '../../../..'),
    r = ownershipReport(root, trackedFiles(root));
  assert.deepEqual([r.problems, r.unknown, r.conflicts], [[], [], []]);
});

test('unknown paths fail only strictly; conflicts and an unreadable map fail everywhere; mixed files never', () => {
  const report = (extra = {}) => ({
    files: 1,
    problems: [],
    unknown: [],
    conflicts: [],
    mixed: ['package.json'],
    ...extra,
  });
  assert.equal(ownershipFails(report()), false);
  assert.equal(ownershipFails(report({ unknown: ['stray.txt'] })), false);
  assert.equal(ownershipFails(report({ unknown: ['stray.txt'] }), { strict: true }), true);
  assert.equal(ownershipFails(report({ conflicts: [{ path: 'a', tiers: ['seed', 'team'], globs: [] }] })), true);
  assert.equal(ownershipFails(report({ problems: ['The ownership map could not be checked.'] })), true);
  const lines = [];
  printOwnership(report({ unknown: ['stray.txt'] }), line => lines.push(line), { strict: true });
  assert.match(lines[0], /^\[ownership\] error: 1 tracked path/);
  lines.length = 0;
  printOwnership(report({ unknown: ['stray.txt'] }), line => lines.push(line));
  assert.match(lines[0], /^\[ownership\] 1 tracked path\(s\) match no rule and are treated as team-owned/);
});

test('a stray top-level file passes pnpm check in a studio but fails the upstream ownership check', t => {
  const source = path.resolve(import.meta.dirname, '../../../..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-ownership-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(source, dir, {
    recursive: true,
    filter: file => !['node_modules', 'dist', '.git'].includes(path.basename(file)),
  });
  fs.symlinkSync(path.join(source, 'node_modules'), path.join(dir, 'node_modules'));
  linkSystemDependencies(source, dir);
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  fs.appendFileSync(path.join(dir, '.git/info/exclude'), 'node_modules\n');
  fs.writeFileSync(path.join(dir, 'team-notes.txt'), 'Our own file.\n');
  git('add', '-A');
  const run = (...args) => spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
  const check = run('src/platform/node/check/check-modules.js');
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.match(check.stdout, /team-notes\.txt/);
  assert.equal(run('src/platform/node/check/check-ownership.js').status, 0);
  const strict = run('src/platform/node/check/check-ownership.js', '--strict');
  assert.equal(strict.status, 1);
  assert.match(strict.stdout, /error: 1 tracked path\(s\) match no rule/);
});
