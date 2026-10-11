// Upgrade test: prove a customized studio can take a newer upstream revision.
//
//   node src/platform/node/check/upgrade-test.js <base> <head> [--keep]
//
// Creates a studio from <base> in a temporary worktree, makes the changes a team makes (a contributor, a system
// with its own package dependency, a prototype, a local module, studio settings, and the README), then merges
// <head> with the update rules in src/platform/node/lib/upstream-merge.js and requires `pnpm check` and `pnpm build` to pass.
// CI passes the latest v* release tag as the base once one exists, and until then the pull request's merge base, which
// can be older than a change that needs a person's help (see PRE_RELEASE_TRANSITIONS below).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeUpstream } from '../lib/upstream-merge.js';
import { TEAM_SYSTEMS_ROOT } from '../../core/roots.ts';
import { CONFIG_KEYS } from '../../core/config.ts';
import { readDeclaration } from '../../core/declarations.ts';
import { serializeConfig, withSettings } from '../../core/config-file.ts';
import { FORMAT_VERSIONS } from '../../core/formats.ts';

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

// Pre-release transitions.
//
// Until the first release exists, CI upgrades a studio made from the pull request's merge base, which can predate a
// change that a released studio would have a migration or an instruction for. Each entry stands in for the manual step
// a pre-release studio needs after taking such a change. It runs after the merge, and only when its condition holds,
// so an update from a base that already has the change runs none of them. Nothing here is part of the update rules
// (src/platform/node/lib/upstream-merge.js). Remove this list, and its uses below, in the first pull request after
// v0.2.0 is tagged: from then on CI starts the test from that tag (.github/workflows/checks.yml), which has every change.
// An entry with phase: 'merge' runs inside the merge, before regeneration, for a step that regeneration needs first.
// The team's fixture module and system, as the steps below create them.
const FIXTURE_MODULE = 'src/modules/fixture-notes';
const FIXTURE_SYSTEM = `${TEAM_SYSTEMS_ROOT}/fixture-kit`;
// A file's text, or '' when the update or the base does not have it, so a condition on it is simply false.
const textOf = file => (fs.existsSync(path.join(dir, file)) ? fs.readFileSync(path.join(dir, file), 'utf8') : '');
// Replaces text in the files that have it; returns whether anything changed.
const rewrite = (files, replacements) => {
  let changed = false;
  for (const file of files) {
    const before = textOf(file);
    const after = replacements.reduce((text, [from, to]) => text.replace(from, to), before);
    if (after === before) continue;
    fs.writeFileSync(path.join(dir, file), after);
    changed = true;
  }
  return changed;
};
// Team code from before the public API imports platform paths directly. A person repoints each import to its
// #studio/* entry, and declares the platform version the module now requires.
const PUBLIC_API_IMPORTS = [
  [/(['"])(?:\.\.\/\.\.\/platform\/core\/api\.ts|@\/platform\/core\/api)\1/g, "'#studio/module'"],
  [/(['"])(?:\.\.\/\.\.\/platform\/modules\/systems\/spec\.ts)\1/g, "'#studio/system'"],
  [/(['"])@\/platform\/app\/data\/types\1/g, "'#studio/system'"],
];
const PUBLIC_API_FILES = [
  `${FIXTURE_MODULE}/module.ts`,
  `${FIXTURE_MODULE}/app.tsx`,
  `${FIXTURE_SYSTEM}/system.ts`,
  `${FIXTURE_SYSTEM}/intro.tsx`,
];
const platformVersion = () => textOf('src/platform/core/modules/index.ts').match(/PLATFORM_VERSION = '([^']+)'/)?.[1];
// The team's content files that declare a formatVersion (src/platform/core/formats.ts), by the format each holds. The
// studio's own tracked files decide, so the sample prototypes and contributor are included when the update left them.
const teamFormatFiles = () => {
  const tracked = read('git', ['ls-files', '-z']).split('\0').filter(Boolean);
  const files = [];
  if (tracked.includes('studio.config.json')) files.push(['studio.config.json', 'config']);
  for (const file of tracked) {
    if (/^contributors\/[^/]+\.json$/.test(file)) files.push([file, 'contributor']);
    else if (/^src\/(?!platform\/)(?:[^/]+\/)*meta\.json$/.test(file)) files.push([file, 'prototype']);
  }
  return files.filter(([file]) => !('formatVersion' in JSON.parse(textOf(file))));
};

const PRE_RELEASE_TRANSITIONS = [
  {
    // The supplied modules moved to src/platform/modules. A team system made before the move imports its spec type from
    // the old path; a person repoints it.
    name: 'repoint the team system spec import',
    applies: () =>
      !fs.existsSync(path.join(dir, 'src/modules/systems/spec.ts')) &&
      textOf(`${FIXTURE_SYSTEM}/system.ts`).includes("'../../modules/systems/spec.ts'"),
    apply: () =>
      rewrite(
        [`${FIXTURE_SYSTEM}/system.ts`],
        [["'../../modules/systems/spec.ts'", "'../../platform/modules/systems/spec.ts'"]],
      ),
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
  {
    // Team modules and systems import the platform only through #studio/* (src/platform/api/), and every module
    // declares requires. A team module and system made before that import platform paths and have no requires; a
    // person repoints the imports and adds the platform version the module was moved to.
    name: 'move the team module and system to the public #studio API',
    applies: () =>
      fs.existsSync(path.join(dir, 'src/platform/api')) &&
      (PUBLIC_API_FILES.some(file => PUBLIC_API_IMPORTS.some(([from]) => new RegExp(from).test(textOf(file)))) ||
        (textOf(`${FIXTURE_MODULE}/module.ts`) !== '' && !/\brequires:/.test(textOf(`${FIXTURE_MODULE}/module.ts`)))),
    apply: () => {
      rewrite(PUBLIC_API_FILES, PUBLIC_API_IMPORTS);
      if (!/\brequires:/.test(textOf(`${FIXTURE_MODULE}/module.ts`)))
        rewrite(
          [`${FIXTURE_MODULE}/module.ts`],
          [[/^([ \t]*)version: '([^']+)',$/m, `$1version: '$2',\n$1requires: '${platformVersion()}',`]],
        );
    },
  },
  {
    // Stored formats carry a formatVersion (src/platform/core/formats.ts). A studio made before that has none in its
    // config, contributor profiles, or prototype meta.json files, and a file the team edited keeps the team's copy
    // through the update. A person adds `"formatVersion": 1` to each, as the creation commands now do.
    name: 'stamp formatVersion in the team config and content files',
    // Runs inside the merge: regenerating AGENTS.md and the skills reads the contributor profiles, which must be valid.
    phase: 'merge',
    applies: () => fs.existsSync(path.join(dir, 'src/platform/core/formats.ts')) && teamFormatFiles().length > 0,
    apply: () => {
      for (const [file, format] of teamFormatFiles()) {
        const value = JSON.parse(textOf(file));
        const stamped =
          format === 'config'
            ? withSettings(value, { formatVersion: FORMAT_VERSIONS.config })
            : { formatVersion: FORMAT_VERSIONS[format], ...value };
        fs.writeFileSync(path.join(dir, file), serializeConfig(stamped));
      }
    },
  },
];

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
  run('pnpm', ['studio', 'create-module', path.basename(FIXTURE_MODULE), '--label', 'Fixture notes', '--yes']);
  // Studio settings: JSON in a studio that has studio.config.json, the older TypeScript file in one that does not yet
  // (a base from before the JSON file; this branch goes away with PRE_RELEASE_TRANSITIONS).
  if (fs.existsSync(path.join(dir, 'studio.config.json')))
    edit('studio.config.json', text => serializeConfig({ ...JSON.parse(text), name: 'Fixture Studio' }));
  else edit('studio.config.ts', text => text.replace(/name: '[^']*'/, "name: 'Fixture Studio'"));
  edit('README.md', text => `${text}\nFixture team notes.\n`);
  // A studio whose base predates the team agent file has nothing to edit.
  const teamAgents = fs.existsSync(path.join(dir, 'AGENTS.team.md'));
  if (teamAgents) {
    edit('AGENTS.team.md', text => `${text}\n${TEAM_AGENTS_LINE}\n`);
    run('pnpm', ['studio', 'sync']);
  }
  run('pnpm', ['check']);
  run('git', ['add', '-A']);
  run('git', ['commit', '-q', '--no-verify', '-m', 'Team changes']);

  step(`Update to ${head} (${headSha.slice(0, 7)})`);
  const inMerge = PRE_RELEASE_TRANSITIONS.filter(transition => transition.phase === 'merge');
  const result = mergeUpstream(dir, headSha, {
    message: `Update to ${headSha.slice(0, 7)}`,
    run,
    beforeRegenerate: () => {
      for (const transition of inMerge) {
        if (!transition.applies()) continue;
        step(`Pre-release transition (during the merge): ${transition.name}`);
        transition.apply();
      }
    },
  });
  if (!result.merged)
    throw new Error(
      `Updating conflicts with team changes in:\n${result.conflicts.map(file => `  ${file}`).join('\n')}`,
    );

  for (const transition of PRE_RELEASE_TRANSITIONS) {
    if (transition.phase === 'merge' || !transition.applies()) continue;
    step(`Pre-release transition: ${transition.name}`);
    transition.apply();
    // A transition whose condition held but that found nothing to change commits nothing.
    if (!read('git', ['status', '--porcelain'])) continue;
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
  // The team's agent guidance survives in its own file and in the generated AGENTS.md, when the base had the file.
  if (teamAgents)
    for (const file of ['AGENTS.team.md', 'AGENTS.md'])
      if (!fs.readFileSync(path.join(dir, file), 'utf8').includes(TEAM_AGENTS_LINE))
        throw new Error(`The update lost the team's agent guidance in ${file}.`);
  for (const folder of ['contributors/fixture.json', 'src/prototypes/fixture', FIXTURE_MODULE]) {
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
