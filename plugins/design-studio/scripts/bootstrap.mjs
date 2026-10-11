import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { packageStarter } from './starter-package.mjs';
import { findWorkingGit, gitEnvironment, verifyPinnedTools, configureLocalGit } from './toolchain.mjs';
import {
  inspectEnvironment,
  environmentIdentity,
  suggestedParent,
  validateConfirmation,
  validateSetupPlan,
  readSetupPlan,
} from './setup-environment.mjs';

export const SOURCE = 'https://github.com/itspatmorgan/design-studio-starter.git';
export const REVISION = '599da74eee43aba5e1c4a97abad8dc87140f3989';
export const RECEIPT = 'design-studio.local.json';
const REQUIRED = [
  'AGENTS.md',
  'package.json',
  'pnpm-lock.yaml',
  'mise.toml',
  'studio.config.ts',
  'src/systems/studio/AGENTS.md',
];

let selectedGit;
function toolEnvironment() {
  selectedGit ??= findWorkingGit();
  return gitEnvironment(selectedGit);
}
function run(command, args, cwd, live = false) {
  const started = performance.now();
  const env = toolEnvironment();
  const result = spawnSync(command === 'git' ? selectedGit : command, args, {
    cwd,
    shell: false,
    encoding: 'utf8',
    stdio: live ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env,
  });
  console.error(`[setup] ${command} ${args[0] ?? ''}: ${((performance.now() - started) / 1000).toFixed(2)}s`);
  if (result.error) throw new Error(`Could not run ${command}: ${result.error.message}`);
  if (result.status !== 0)
    throw new Error(
      `${command} failed (${result.status ?? result.signal}). ${live ? 'See the setup log.' : (result.stderr || result.stdout || '').trim()}`,
    );
  return result.stdout?.trim();
}

export function destinationPath(value) {
  if (!value || !path.isAbsolute(value)) throw new Error('Choose an absolute folder path on this computer.');
  const destination = path.resolve(value);
  if (
    destination === path.parse(destination).root ||
    destination
      .split(path.sep)
      .some(part => ['.codex', '.agents', '.claude', '.cursor', '.git', 'node_modules'].includes(part))
  ) {
    throw new Error('Choose a visible folder outside plugin caches, Git internals, and dependency folders.');
  }
  return destination;
}

// Validate the nearest existing ancestor before creating even a parent folder.
export function validateDestination(value) {
  const destination = destinationPath(value);
  let ancestor = destination;
  while (true) {
    try {
      const stat = fs.lstatSync(ancestor);
      if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(ancestor) !== ancestor) {
        throw new Error(
          'Choose a folder whose parents are ordinary directories, not links. Existing files were preserved.',
        );
      }
      fs.accessSync(ancestor, fs.constants.W_OK | fs.constants.X_OK);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      ancestor = path.dirname(ancestor);
    }
  }
  if (fs.existsSync(destination)) {
    try {
      inspectStudio(destination);
    } catch (error) {
      throw new Error(
        `The destination is occupied and is not a resumable plugin-created studio. Existing files were preserved. Use open-studio for an existing source checkout. ${error.message}`,
      );
    }
  }
  return destination;
}

function verifyFiles(destination) {
  if (fs.lstatSync(destination).isSymbolicLink() || !fs.statSync(destination).isDirectory())
    throw new Error('The studio folder must be an ordinary directory.');
  for (const relative of REQUIRED) {
    const file = path.join(destination, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile())
      throw new Error(`This folder is missing ${relative}. Existing files were preserved.`);
    if (!fs.realpathSync(file).startsWith(fs.realpathSync(destination) + path.sep))
      throw new Error(`${relative} points outside the studio.`);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'), 'utf8'));
  if (pkg.name !== 'design-studio-starter' || !pkg.scripts?.dev)
    throw new Error('This does not look like a Design Studio starter.');
  if (!fs.lstatSync(path.join(destination, '.git')).isDirectory())
    throw new Error('Expected an ordinary local Git repository.');
}

export function inspectStudio(value) {
  const destination = destinationPath(value);
  verifyFiles(destination);
  const file = path.join(destination, RECEIPT);
  if (fs.lstatSync(file).isSymbolicLink()) throw new Error('The setup receipt must be an ordinary file.');
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (
    receipt.schema !== 1 ||
    receipt.product !== 'design-studio' ||
    !/^[0-9a-f]{40}$/.test(receipt.revision) ||
    typeof receipt.name !== 'string' ||
    typeof receipt.prepared !== 'boolean'
  )
    throw new Error('The setup receipt is invalid. Existing files were preserved.');
  return { ...receipt, destination, existing: true };
}

export function studioFolderName(name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 120)
    throw new Error('Choose a studio name between 1 and 120 characters.');
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'design-studio'
  );
}

// Selection is read-only; createStudio reserves the chosen folder exclusively.
export function chooseStudioLocation({ parent, name: baseName = 'Design Studio' } = {}) {
  const folder = destinationPath(parent ?? suggestedParent(process.platform, os.homedir()));
  const baseFolder = studioFolderName(baseName);
  for (let number = 1; ; number += 1) {
    const name = number === 1 ? baseName : `${baseName} ${number}`;
    const folderName = number === 1 ? baseFolder : `${baseFolder}-${number}`;
    const destination = destinationPath(path.join(folder, folderName));
    try {
      fs.lstatSync(destination);
    } catch (error) {
      if (error.code === 'ENOENT') return { name, destination };
      throw error;
    }
  }
}

export function auditStudio(options = {}, environment = inspectEnvironment()) {
  if (options.destination && options.parent) throw new Error('Choose a destination or a parent folder, not both.');
  let selected;
  let destinationCheck;
  try {
    selected = options.destination
      ? { name: options.name ?? 'Design Studio', destination: destinationPath(options.destination) }
      : chooseStudioLocation({ parent: options.parent ?? environment.suggestedParent, name: options.name });
    validateDestination(selected.destination);
    if (fs.existsSync(selected.destination) && options.name === undefined)
      selected.name = inspectStudio(selected.destination).name;
    destinationCheck = { available: true };
  } catch (error) {
    destinationCheck = { available: false, reason: error.message, code: error.code ?? null };
  }
  return { environment, recommendation: selected ?? null, destinationCheck };
}

function saveSetupPlan(plan, output) {
  if (output && !path.isAbsolute(output))
    throw new Error('Choose an absolute --output path for the setup plan outside the studio.');
  const file = output
    ? path.resolve(output)
    : path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'design-studio-setup-')), 'plan.json');
  if (file === plan.destination || file.startsWith(plan.destination + path.sep))
    throw new Error('Save setup tooling outside the studio destination.');
  fs.writeFileSync(file, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return file;
}

export function planStudio(options, environment = inspectEnvironment()) {
  validateConfirmation(options.confirmation);
  if (!options.destination)
    throw new Error('Provide the exact user-confirmed destination from the audit and folder recommendation.');
  const selected = { destination: options.destination, name: options.name ?? 'Design Studio' };
  selected.name = selected.name.trim();
  const destination = validateDestination(selected.destination);
  studioFolderName(selected.name);
  if (fs.existsSync(destination) && inspectStudio(destination).name !== selected.name) {
    throw new Error(
      'For interrupted setup, use the existing studio name and destination. Existing settings were preserved.',
    );
  }
  return {
    schema: 1,
    kind: 'design-studio-setup',
    ...selected,
    destination,
    environment: environmentIdentity(environment),
    confirmation: options.confirmation.trim(),
  };
}

export function createStudio({
  destination: value,
  name = 'Design Studio',
  source = SOURCE,
  revision = REVISION,
  plan,
}) {
  // Absolute local sources are maintainer fixtures only, never an agent setup fallback.
  if (source === SOURCE || plan) {
    validateSetupPlan(plan);
    if (destinationPath(value) !== plan.destination || name !== plan.name)
      throw new Error('The destination or name differs from the setup plan. Use the saved plan unchanged.');
  }
  const destination = validateDestination(value);
  if (!name.trim() || name.length > 120) throw new Error('Choose a studio name between 1 and 120 characters.');
  if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error('The starter revision must be a complete commit hash.');
  if (source !== SOURCE && !path.isAbsolute(source))
    throw new Error('Test sources must be absolute local repository paths.');
  if (fs.existsSync(destination)) return inspectStudio(destination);
  run('git', ['--version']);
  const parent = path.dirname(destination);
  fs.mkdirSync(parent, { recursive: true });
  if (fs.realpathSync(parent) !== parent)
    throw new Error('Choose a folder whose parents are ordinary directories, not links.');
  const staging = fs.mkdtempSync(path.join(parent, '.design-studio-setup-'));
  try {
    run('git', ['init', '--initial-branch=main', staging]);
    run(
      'git',
      [
        '-c',
        'protocol.allow=never',
        '-c',
        source === SOURCE ? 'protocol.https.allow=always' : 'protocol.file.allow=always',
        'fetch',
        '--depth=1',
        '--no-tags',
        '--',
        source,
        revision,
      ],
      staging,
    );
    run('git', ['checkout', '-B', 'main', 'FETCH_HEAD'], staging);
    if (run('git', ['rev-parse', 'HEAD'], staging) !== revision)
      throw new Error('Downloaded starter did not match the pinned revision.');
    verifyFiles(staging);
    const files = run('git', ['ls-files', '-z'], staging).split('\0').filter(Boolean);
    packageStarter(staging, files);
    // Only this fresh staging checkout is repackaged. Existing studios return above.
    fs.rmSync(path.join(staging, '.git'), { recursive: true, force: true });
    run('git', ['init', '--initial-branch=main', staging]);
    run('git', ['add', '--all'], staging);
    run(
      'git',
      [
        '-c',
        'user.name=Design Studio Setup',
        '-c',
        'user.email=setup@design-studio.local',
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '-m',
        `Create Design Studio from ${revision}`,
      ],
      staging,
    );
    const receipt = { schema: 1, product: 'design-studio', source, revision, name: name.trim(), prepared: false };
    fs.writeFileSync(path.join(staging, RECEIPT), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    fs.appendFileSync(path.join(staging, '.git/info/exclude'), `\n/${RECEIPT}\n`);
    // Reserve exclusively before moving anything. An existing folder is never replaced.
    fs.mkdirSync(destination);
    for (const entry of fs.readdirSync(staging))
      fs.renameSync(path.join(staging, entry), path.join(destination, entry));
    return { ...receipt, destination, existing: false };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

export function checkInitialConfiguration(studio) {
  if (!studio.prepared && run('git', ['diff', 'HEAD', '--', 'studio.config.ts'], studio.destination)) {
    throw new Error(
      'Studio settings changed during setup. They were preserved. Review them before applying first-run defaults.',
    );
  }
}

// Older pinned starters only ask Claude to read instructions. Import the shared source,
// and never replace a person's existing Claude instructions.
export function ensureClaudeEntry(destination) {
  const file = path.join(destination, 'CLAUDE.md');
  const legacy =
    '# Design Studio\n\nRead and follow [repository instructions](AGENTS.md) before work. Project skills route to their canonical sources.\n';
  if (
    fs.existsSync(file) &&
    fs.lstatSync(file).isFile() &&
    !fs.lstatSync(file).isSymbolicLink() &&
    fs.readFileSync(file, 'utf8') === legacy
  ) {
    fs.writeFileSync(file, '@AGENTS.md\n');
    return;
  }
  try {
    fs.writeFileSync(file, '@AGENTS.md\n', { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

export function prepareStudio(value, plan) {
  const studio = inspectStudio(validateDestination(value));
  if (plan || (!studio.prepared && studio.source === SOURCE)) {
    validateSetupPlan(plan);
    if (studio.destination !== plan.destination || studio.name !== plan.name)
      throw new Error('Preparation must use the planned studio folder and name.');
  }
  checkInitialConfiguration(studio);
  run('mise', ['--version']);
  if (configureLocalGit(studio.destination, selectedGit)) {
    run('mise', ['trust', path.join(studio.destination, 'mise.local.toml')], studio.destination, true);
  } else
    console.error('[setup] Existing local tool configuration preserved. Use bootstrap exec for follow-up commands.');
  // Trust this inspected studio config, not all ancestor configurations.
  run('mise', ['trust', path.join(studio.destination, 'mise.toml')], studio.destination, true);
  run('mise', ['install'], studio.destination, true);
  console.error('[setup] tools: ' + JSON.stringify(verifyPinnedTools(studio.destination, toolEnvironment())));
  run('mise', ['exec', 'pnpm@12', '--', 'pnpm', 'install', '--frozen-lockfile'], studio.destination, true);
  if (!studio.prepared) {
    run(
      'mise',
      ['exec', 'pnpm@12', '--', 'pnpm', 'studio', 'configure', '--name', studio.name, '--usage', 'personal', '--yes'],
      studio.destination,
      true,
    );
    const { destination, existing, ...receipt } = studio;
    receipt.prepared = true;
    fs.writeFileSync(path.join(destination, RECEIPT), JSON.stringify(receipt, null, 2) + '\n');
  }
  run('mise', ['exec', 'pnpm@12', '--', 'pnpm', 'studio', 'sync'], studio.destination, true);
  ensureClaudeEntry(studio.destination);
  return inspectStudio(value);
}

// All follow-up commands (identity, builds, Sites source workflow and hooks)
// inherit verified Git, then let mise prepend the studio's pinned runtime.
export function execStudio(value, args) {
  const studio = inspectStudio(value);
  if (!args.length) throw new Error('Provide a command after --.');
  verifyPinnedTools(studio.destination, toolEnvironment());
  return run('mise', ['exec', '--', ...args], studio.destination, true);
}

export function startStudio(value, port = '5173') {
  const studio = inspectStudio(value);
  if (!/^[0-9]+$/.test(port) || Number(port) < 1024 || Number(port) > 65535)
    throw new Error('Choose a local port between 1024 and 65535.');
  execStudio(value, ['pnpm', 'dev', '--host', '127.0.0.1', '--port', port]);
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help') {
    console.log(`Usage: node bootstrap.mjs audit [--destination <folder> | --parent <folder>] [--name <name>]
       node bootstrap.mjs preflight
       node bootstrap.mjs choose [--parent <absolute-folder>] [--name <studio-name>]
       node bootstrap.mjs plan --destination <confirmed-folder> --confirmation <user-response> [--name <name>] [--output <absolute-json-file>]
       node bootstrap.mjs create|setup --plan <absolute-json-file>
       node bootstrap.mjs prepare --destination <folder> [--plan <absolute-json-file>]
       node bootstrap.mjs inspect|start --destination <folder> [--port <port>]
       node bootstrap.mjs exec --destination <folder> -- <command> [args...]
audit combines read-only environment inspection, folder recommendation, and destination validation. Share its findings and exact destination with the user for confirmation or modification.
Suggested parents are ~/Developer on macOS and ~/Projects on Windows/Linux. They are suggestions, never silent installation defaults.
plan records the user's response and validates the confirmed destination without creating a studio. It returns an automatically saved planFile; --output overrides that location.
setup combines creation and preparation from one checked plan. Interrupted first-run prepare requires that plan too.
Maintainer fixtures only: create --destination <folder> --source <absolute-local-repo> --revision <40-character-commit> [--name <name>].
Git and Node are prerequisites. prepare/start also require mise. No GitHub account is needed.`);
    return;
  }
  const allowedOptions = {
    audit: ['--destination', '--parent', '--name'],
    preflight: [],
    choose: ['--parent', '--name'],
    plan: ['--destination', '--name', '--confirmation', '--output'],
    create: ['--plan', '--destination', '--name', '--source', '--revision'],
    setup: ['--plan'],
    inspect: ['--destination'],
    prepare: ['--destination', '--plan'],
    start: ['--destination', '--port'],
    exec: ['--destination'],
  };
  if (!allowedOptions[command]) throw new Error(`Unknown command: ${command}`);
  const options = {};
  const separator = command === 'exec' ? args.indexOf('--') : -1;
  const commandArgs = separator < 0 ? [] : args.splice(separator).slice(1);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const allowed = allowedOptions[command];
    if (!allowed.includes(key) || !args[i + 1]) throw new Error(`Invalid option: ${key}`);
    if (options[key.slice(2)] !== undefined) throw new Error(`Repeated option: ${key}`);
    options[key.slice(2)] = args[i + 1];
  }
  if (command === 'audit') {
    console.log(JSON.stringify(auditStudio(options), null, 2));
    return;
  }
  if (command === 'preflight') {
    console.log(JSON.stringify(inspectEnvironment(), null, 2));
    return;
  }
  if (command === 'plan') {
    if (!options.destination)
      throw new Error('Provide the exact user-confirmed --destination from the audit and folder recommendation.');
    const plan = planStudio(options);
    console.log(JSON.stringify({ ...plan, planFile: saveSetupPlan(plan, options.output) }, null, 2));
    return;
  }
  if (command === 'choose') {
    console.log(JSON.stringify(chooseStudioLocation(options), null, 2));
    return;
  }
  if (command === 'exec') return execStudio(options.destination, commandArgs);
  let plan;
  if (options.plan) {
    plan = readSetupPlan(options.plan);
    if (command === 'create' && Object.keys(options).some(key => key !== 'plan'))
      throw new Error('Use --plan alone for creation; the plan owns the destination and name.');
  }
  if (command === 'create' || command === 'setup') {
    if (plan) Object.assign(options, { destination: plan.destination, name: plan.name, plan });
    else if (command === 'setup' || !options.source || options.source === SOURCE)
      throw new Error('A setup plan is required before creation. Run audit, confirm the folder, then plan.');
  }
  if (command === 'setup') {
    createStudio(options);
    console.log(JSON.stringify(prepareStudio(options.destination, plan), null, 2));
    return;
  }
  if (command === 'start') return startStudio(options.destination, options.port);
  const result =
    command === 'create'
      ? createStudio(options)
      : command === 'prepare'
        ? prepareStudio(options.destination, plan)
        : inspectStudio(options.destination);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(`Could not complete studio setup: ${error.message}`);
    process.exitCode = 1;
  }
}
