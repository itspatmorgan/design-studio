// Upgrade test: prove a customized studio can take a newer upstream revision.
//
//   node src/platform/node/check/upgrade-test.js <base> <head> [--keep]
//
// Creates a studio from <base> in a temporary worktree, makes the changes a team makes (a contributor, a system
// with its own package dependency, a prototype, a local module, studio settings, and the README), then merges
// <head> with the update rules in src/platform/node/lib/upstream-merge.js and requires `pnpm check` and `pnpm build` to pass.
// CI passes the latest v* release tag as the base, so every change proves that a studio on the last release can take it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeUpstream } from '../lib/upstream-merge.js';
import { loadOwnership, tierOf, trackedFiles } from '../lib/ownership.js';
import { TEAM_SYSTEMS_ROOT } from '../../core/roots.ts';
import { serializeConfig } from '../../core/config-file.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const [base, head, ...options] = process.argv.slice(2);
if (!base || !head || options.some(option => option !== '--keep'))
  throw new Error('Usage: upgrade-test.js <base> <head> [--keep]');
const resolve = ref =>
  execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: ROOT, encoding: 'utf8' }).trim();
const [baseSha, headSha] = [resolve(base), resolve(head)];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-upgrade-'));
const step = title => console.log(`\n[upgrade] ${title}`);
const run = (command, args) =>
  execFileSync(command, args, { cwd: dir, stdio: 'inherit', env: { ...process.env, CI: process.env.CI ?? '1' } });
const read = (command, args) => execFileSync(command, args, { cwd: dir, encoding: 'utf8' }).trim();
const TEAM_AGENTS_LINE = 'Fixture team agent guidance.';
const edit = (file, change) => {
  const target = path.join(dir, file);
  fs.writeFileSync(target, change(fs.readFileSync(target, 'utf8')));
};

const FIXTURE_MODULE = 'src/modules/fixture-notes';

let ok = false;
try {
  step(`Create a studio from ${base} (${baseSha.slice(0, 7)})`);
  execFileSync('git', ['worktree', 'add', '-q', '--detach', dir, baseSha], { cwd: ROOT, stdio: 'inherit' });
  // The fixture person's Git identity, for every command below. `git config` in a linked worktree would write it
  // into the repository's shared config, replacing the identity of the checkout running this test.
  Object.assign(process.env, {
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'user.name',
    GIT_CONFIG_VALUE_0: 'Fixture Person',
    GIT_CONFIG_KEY_1: 'user.email',
    GIT_CONFIG_VALUE_1: 'fixture@example.test',
  });
  run('pnpm', ['install', '--frozen-lockfile']);
  const originalDependencies = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).dependencies;

  step('Make team changes');
  run('pnpm', [
    'join',
    '--key',
    'fixture',
    '--name',
    'Fixture Person',
    '--email',
    'fixture@example.test',
    '--github',
    'fixture-person',
    '--yes',
  ]);
  run('pnpm', ['studio', 'create-system', 'fixture-kit', '--label', 'Fixture kit', '--yes']);
  const system = JSON.parse(
    fs.readFileSync(path.join(dir, TEAM_SYSTEMS_ROOT, 'fixture-kit/package.json'), 'utf8'),
  ).name;
  run('pnpm', ['--filter', system, 'add', 'clsx@2.1.1']);
  run('pnpm', ['add', '-w', 'clsx@2.1.1']);
  run('pnpm', ['new', 'Fixture Prototype']);
  run('pnpm', ['studio', 'create-module', path.basename(FIXTURE_MODULE), '--label', 'Fixture notes', '--yes']);
  edit('studio.config.json', text => serializeConfig({ ...JSON.parse(text), name: 'Fixture Studio' }));
  edit('README.md', text => `${text}\nFixture team notes.\n`);
  edit('AGENTS.team.md', text => `${text}\n${TEAM_AGENTS_LINE}\n`);
  run('pnpm', ['studio', 'sync']);
  run('pnpm', ['check']);
  run('git', ['add', '-A']);
  run('git', ['commit', '-q', '--no-verify', '-m', 'Team changes']);

  const ownership = loadOwnership(dir);
  const protectedFiles = trackedFiles(dir).filter(file =>
    ['seed', 'team', 'unknown'].includes(tierOf(ownership, file)),
  );
  const protectedBytes = new Map(protectedFiles.map(file => [file, fs.readFileSync(path.join(dir, file))]));
  const dependencies = Object.fromEntries(
    Object.entries(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).dependencies).filter(
      ([name, version]) => originalDependencies[name] !== version,
    ),
  );

  step(`Update to ${head} (${headSha.slice(0, 7)})`);
  const result = mergeUpstream(dir, headSha, { message: `Update to ${headSha.slice(0, 7)}`, run });
  if (!result.merged)
    throw new Error(
      `Updating conflicts with team changes in:\n${result.conflicts.map(file => `  ${file}`).join('\n')}`,
    );

  step('Verify the updated studio');
  for (const [file, bytes] of protectedBytes) {
    if (!fs.existsSync(path.join(dir, file)) || !fs.readFileSync(path.join(dir, file)).equals(bytes))
      throw new Error(`The update changed or removed the team's complete copy of ${file}.`);
  }
  const current = new Set(trackedFiles(dir));
  const expected = new Set(protectedFiles);
  for (const file of current)
    if (['team', 'unknown'].includes(tierOf(ownership, file)) && !expected.has(file))
      throw new Error(`The update introduced an unexpected team file: ${file}.`);
  const updatedDependencies = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).dependencies;
  for (const [name, version] of Object.entries(dependencies))
    if (updatedDependencies[name] !== version)
      throw new Error(
        `The update changed the studio's dependency ${name}: ${version} -> ${updatedDependencies[name]}.`,
      );
  if (!fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes(TEAM_AGENTS_LINE))
    throw new Error('The update lost the team guidance in regenerated AGENTS.md.');
  run('pnpm', ['install', '--frozen-lockfile']);
  run('pnpm', ['studio', 'sync', '--check']);
  run('pnpm', ['check']);
  run('pnpm', ['build']);
  if (read('git', ['status', '--porcelain']))
    throw new Error('Verification changed tracked files:\n' + read('git', ['status', '--short']));
  ok = true;
  console.log(`\n[upgrade] A customized studio from ${baseSha.slice(0, 7)} updates cleanly to ${headSha.slice(0, 7)}.`);
} finally {
  if (options.includes('--keep')) console.log(`[upgrade] Kept the studio at ${dir}`);
  else execFileSync('git', ['worktree', 'remove', '--force', dir], { cwd: ROOT, stdio: 'inherit' });
}
process.exit(ok ? 0 : 1);
