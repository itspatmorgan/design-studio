// Conservative regression selection. Publishing validation is never selected away.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const patterns = [
  'src/platform/**/*.test.ts',
  'src/modules/**/*.test.ts',
  'src/modules/**/*.test.js',
  'src/platform/node/**/*.test.js',
];
export const discoverTests = (root = process.cwd()) => [...fs.globSync(patterns, { cwd: root })].sort();
export function matches(file, glob) {
  const escaped = glob
    .split('**')
    .map(part =>
      part
        .split('*')
        .map(text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*');
  return new RegExp(`^${escaped}$`).test(file);
}
// Static imports add transitive dependencies; catalog patterns cover subprocesses,
// fixture file reads, globs, and other dependencies that imports cannot describe.
export function importedDependencies(catalog, root = process.cwd()) {
  const cache = new Map();
  function imports(file) {
    if (cache.has(file)) return cache.get(file);
    const result = new Set();
    cache.set(file, result);
    if (!fs.existsSync(path.join(root, file))) return result;
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of source.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g,
    )) {
      const specifier = match[1];
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue;
      const relative = specifier.startsWith('@/')
        ? 'src/' + specifier.slice(2)
        : path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
      if (relative.startsWith('../')) continue;
      const candidates = [
        relative,
        relative.replace(/\.js$/, '.ts'),
        ...['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js'].map(
          extension => relative + extension,
        ),
      ];
      const dependency = candidates.find(
        candidate => fs.existsSync(path.join(root, candidate)) && fs.statSync(path.join(root, candidate)).isFile(),
      );
      if (dependency) result.add(dependency);
    }
    return result;
  }
  return Object.fromEntries(
    Object.entries(catalog.groups).map(([name, group]) => {
      const visited = new Set();
      const visit = file => {
        if (visited.has(file)) return;
        visited.add(file);
        for (const dependency of imports(file)) visit(dependency);
      };
      group.tests.forEach(visit);
      return [name, visited];
    }),
  );
}
export function selectTests(files, catalog, available, { full = false, reason = '', imports = {} } = {}) {
  const names = Object.keys(catalog.groups);
  const classified = new Set(names.flatMap(name => catalog.groups[name].tests));
  const unknownTests = available.filter(file => !classified.has(file));
  const reasons = [];
  const selected = new Set();
  if (full) reasons.push(reason || 'Full verification requested.');
  if (unknownTests.length) {
    full = true;
    reasons.push(`Unclassified tests: ${unknownTests.join(', ')}`);
  }
  for (const file of files) {
    if (!file || file.startsWith('/') || file.split('/').includes('..') || file.includes('\\')) {
      full = true;
      reasons.push('Unrecognized change path.');
      continue;
    }
    if (
      /^(package\.json|pnpm-.*|patches\/|mise.*|tsconfig.*|vite\.config.*|studio\.(config|lock)\.|\.github\/|src\/platform\/node\/check\/(test.*|verification.*))/.test(
        file,
      )
    ) {
      full = true;
      reasons.push(`${file}: verification, dependencies, or infrastructure changed.`);
      continue;
    }
    // Studio's system (src/platform/systems/studio) is application code. The team's systems and prototypes are authored content.
    if (
      file.startsWith('src/prototypes/') ||
      file.startsWith('src/systems/') ||
      file.startsWith('contributors/') ||
      file.startsWith('public/')
    ) {
      reasons.push(`${file}: authored content; production checks remain required.`);
      continue;
    }
    const affected = names.filter(
      name =>
        imports[name]?.has(file) ||
        catalog.groups[name].dependencies.some(glob => matches(file, glob)) ||
        catalog.groups[name].tests.includes(file),
    );
    if (affected.length) {
      affected.forEach(name => selected.add(name));
      reasons.push(`${file}: ${affected.join(', ')}.`);
    } else if (
      /\.md$/.test(file) &&
      (/^[A-Z][A-Z_-]*\.md$/.test(file) || file.startsWith('src/') || file.startsWith('src/platform/node/eval/'))
    )
      reasons.push(`${file}: documentation; production checks remain required.`);
    else {
      full = true;
      reasons.push(`${file}: no reviewed dependency rule.`);
    }
  }
  const groups = full ? names : names.filter(name => selected.has(name));
  const tests = full
    ? available
    : [...new Set(groups.flatMap(name => catalog.groups[name].tests).filter(file => available.includes(file)))].sort();
  return { version: 1, full, groups, tests, reasons, changedFiles: files };
}
export function changedPaths(base, head, { root = process.cwd(), mergeBase = false } = {}) {
  const git = args =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (!/^[a-zA-Z0-9_./-]+$/.test(base ?? '') || !/^[a-zA-Z0-9_./-]+$/.test(head ?? '') || /^0+$/.test(base))
    throw new Error('No reliable comparison revision.');
  const before = git(['rev-parse', '--verify', `${base}^{commit}`]);
  const after = git(['rev-parse', '--verify', `${head}^{commit}`]);
  if (after !== git(['rev-parse', 'HEAD'])) throw new Error('Comparison head is not the checkout being tested.');
  const comparison = mergeBase ? git(['merge-base', before, after]) : before;
  // Disable rename collapsing: both removed and added paths participate, including cross-area moves.
  const raw = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', comparison, after], {
    cwd: root,
    encoding: 'utf8',
  });
  const files = raw.split('\0').filter(Boolean);
  if (after === git(['rev-parse', 'HEAD'])) {
    // Local execution tests checkout files, so include staged, unstaged, and new work.
    for (const args of [
      ['diff', '--no-renames', '--name-only', '-z', 'HEAD'],
      ['ls-files', '--others', '--exclude-standard', '-z'],
    ]) {
      files.push(...execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean));
    }
  }
  return [...new Set(files)].sort();
}
export function planTests(base, head, { root = process.cwd(), full = false, mergeBase = false } = {}) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/platform/node/check/test-groups.json'), 'utf8'));
  if (
    catalog.version !== 1 ||
    !catalog.groups ||
    Object.values(catalog.groups).some(group => !Array.isArray(group.tests) || !Array.isArray(group.dependencies))
  )
    throw new Error('Invalid test dependency catalog.');
  const available = discoverTests(root);
  if (!available.length) throw new Error('No retained regression tests found; verification cannot be confirmed.');
  let files = [],
    reason = '';
  try {
    files = changedPaths(base, head, { root, mergeBase });
  } catch (error) {
    full = true;
    reason = `Comparison unavailable: ${error.message}`;
  }
  // A removed dependency may disappear from the current import graph. Do not guess.
  if (
    files.some(
      file =>
        !fs.existsSync(path.join(root, file)) &&
        !file.startsWith('src/prototypes/') &&
        !file.startsWith('src/systems/'),
    )
  ) {
    full = true;
    reason = 'Removed non-authoring paths require full verification.';
  }
  return selectTests(files, catalog, available, { full, reason, imports: importedDependencies(catalog, root) });
}
