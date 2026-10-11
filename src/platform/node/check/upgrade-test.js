// Upgrade test: prove a customized studio can take a newer upstream revision.
//
//   node src/platform/node/check/upgrade-test.js <base> <head> [--keep]
//
// Creates a studio from <base> in a temporary worktree, makes the changes a team makes (a contributor, a system
// with its own package dependency, a prototype, a local module, studio settings, and the README), then merges
// <head> with the update rules in src/platform/node/lib/upstream-merge.js and requires `pnpm check` and `pnpm build` to pass.
// Until the first release exists, CI passes the pull request's merge base and head.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeUpstream } from '../lib/upstream-merge.js';
import { TEAM_SYSTEMS_ROOT } from '../../core/roots.ts';

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
const edit = (file, change) => {
  const target = path.join(dir, file);
  fs.writeFileSync(target, change(fs.readFileSync(target, 'utf8')));
};

let ok = false;
try {
  step(`Create a studio from ${base} (${baseSha.slice(0, 7)})`);
  execFileSync('git', ['worktree', 'add', '-q', '--detach', dir, baseSha], { cwd: ROOT, stdio: 'inherit' });
  run('git', ['config', 'user.name', 'Fixture Person']);
  run('git', ['config', 'user.email', 'fixture@example.test']);
  run('pnpm', ['install', '--frozen-lockfile']);

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
  run('pnpm', ['new', 'Fixture Prototype']);
  run('pnpm', ['studio', 'create-module', 'fixture-notes', '--label', 'Fixture notes', '--yes']);
  edit('studio.config.ts', text => text.replace(/name: '[^']*'/, "name: 'Fixture Studio'"));
  edit('README.md', text => `${text}\nFixture team notes.\n`);
  run('pnpm', ['check']);
  run('git', ['add', '-A']);
  run('git', ['commit', '-q', '--no-verify', '-m', 'Team changes']);

  step(`Update to ${head} (${headSha.slice(0, 7)})`);
  const result = mergeUpstream(dir, headSha, { message: `Update to ${headSha.slice(0, 7)}`, run });
  if (!result.merged)
    throw new Error(
      `Updating conflicts with team changes in:\n${result.conflicts.map(file => `  ${file}`).join('\n')}`,
    );

  step('Verify the updated studio');
  for (const [file, text] of [
    ['studio.config.ts', "'Fixture Studio'"],
    ['README.md', 'Fixture team notes.'],
    [`${TEAM_SYSTEMS_ROOT}/fixture-kit/package.json`, '"clsx"'],
  ]) {
    if (!fs.readFileSync(path.join(dir, file), 'utf8').includes(text))
      throw new Error(`The update lost the team's change to ${file}.`);
  }
  for (const folder of ['contributors/fixture.json', 'src/prototypes/fixture', 'src/modules/fixture-notes']) {
    if (!fs.existsSync(path.join(dir, folder))) throw new Error(`The update removed ${folder}.`);
  }
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
