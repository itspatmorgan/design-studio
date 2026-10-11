// Upgrade test: prove a customized studio can take a newer upstream revision.
//
//   node src/platform/node/check/upgrade-test.js <base> <head> [--keep]
//
// Creates a studio from <base> in a temporary worktree, makes the changes a team makes (a contributor, a system
// with its own package dependency, a prototype, a local module, studio settings, and the README), then merges
// <head> with the update rules in src/platform/node/lib/upstream-merge.js and requires `pnpm check` and `pnpm build` to pass.
// Until the first release exists, CI passes the pull request's merge base and head, so the base can be older than a
// change that needs a person's help (see PRE_RELEASE_TRANSITIONS below).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeUpstream } from '../lib/upstream-merge.js';
import { TEAM_SYSTEMS_ROOT } from '../../core/roots.ts';
import { CONFIG_KEYS } from '../../core/config.ts';
import { readDeclaration } from '../../core/declarations.ts';
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
const edit = (file, change) => {
  const target = path.join(dir, file);
  fs.writeFileSync(target, change(fs.readFileSync(target, 'utf8')));
};

// Pre-release transitions.
//
// Until the first release exists, CI upgrades a studio made from the pull request's merge base, which can predate a
// change that a released studio would have a migration or an instruction for. Each entry stands in for the manual step
// a pre-release studio needs after taking such a change. It runs after the merge, and only when its condition holds,
// so an update from a base that already has the change runs none of them. Nothing here is part of the update rules
// (src/platform/node/lib/upstream-merge.js). Remove this list when the upgrade test starts from the first release tag.
const PRE_RELEASE_TRANSITIONS = [
  {
    // The supplied modules moved to src/platform/modules. A team system made before the move imports its spec type from
    // the old path; a person repoints it.
    name: 'repoint the team system spec import',
    applies: () =>
      !fs.existsSync(path.join(dir, 'src/modules/systems/spec.ts')) &&
      fs
        .readFileSync(path.join(dir, TEAM_SYSTEMS_ROOT, 'fixture-kit/system.ts'), 'utf8')
        .includes("'../../modules/systems/spec.ts'"),
    apply: () => {
      const file = path.join(dir, TEAM_SYSTEMS_ROOT, 'fixture-kit/system.ts');
      fs.writeFileSync(
        file,
        fs
          .readFileSync(file, 'utf8')
          .replace("'../../modules/systems/spec.ts'", "'../../platform/modules/systems/spec.ts'"),
      );
    },
  },
  {
    // Settings moved from studio.config.ts to studio.config.json. Upstream deleted the TypeScript file, which the team
    // had edited, so the update kept the team's copy (a seed file) next to the new JSON seed. A person moves the team's
    // settings into the JSON file and deletes the TypeScript one; Studio is the platform system and is no longer listed
    // in systems.
    name: 'move the team settings from studio.config.ts into studio.config.json',
    applies: () =>
      fs.existsSync(path.join(dir, 'studio.config.ts')) && fs.existsSync(path.join(dir, 'studio.config.json')),
    apply: () => {
      const team = readDeclaration(fs.readFileSync(path.join(dir, 'studio.config.ts'), 'utf8'));
      if ('error' in team) throw new Error(`studio.config.ts: ${team.error}`);
      const seed = JSON.parse(fs.readFileSync(path.join(dir, 'studio.config.json'), 'utf8'));
      // The team's values win; settings only the new seed has (such as a module added upstream) are kept.
      const merged = {
        ...seed,
        ...team.value,
        modules: { ...seed.modules, ...team.value.modules },
        systems: team.value.systems.filter(id => id !== 'studio'),
      };
      const ordered = Object.fromEntries(CONFIG_KEYS.filter(key => key in merged).map(key => [key, merged[key]]));
      fs.writeFileSync(path.join(dir, 'studio.config.json'), serializeConfig(ordered));
      fs.rmSync(path.join(dir, 'studio.config.ts'));
      // The routing block of AGENTS.md follows the enabled modules, which the team's settings just changed.
      run('pnpm', ['studio', 'sync']);
    },
  },
];

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
  // Studio settings: JSON in a studio that has studio.config.json, the older TypeScript file in one that does not yet
  // (a base from before the JSON file; this branch goes away with PRE_RELEASE_TRANSITIONS).
  if (fs.existsSync(path.join(dir, 'studio.config.json')))
    edit('studio.config.json', text => serializeConfig({ ...JSON.parse(text), name: 'Fixture Studio' }));
  else edit('studio.config.ts', text => text.replace(/name: '[^']*'/, "name: 'Fixture Studio'"));
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

  for (const transition of PRE_RELEASE_TRANSITIONS) {
    if (!transition.applies()) continue;
    step(`Pre-release transition: ${transition.name}`);
    transition.apply();
    run('git', ['add', '-A']);
    run('git', ['commit', '-q', '--no-verify', '-m', `Pre-release transition: ${transition.name}`]);
  }

  step('Verify the updated studio');
  for (const [file, text] of [
    ['studio.config.json', '"Fixture Studio"'],
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
