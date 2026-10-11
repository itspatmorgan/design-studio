import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import {
  createStudio,
  chooseStudioLocation,
  studioFolderName,
  destinationPath,
  inspectStudio,
  checkInitialConfiguration,
  ensureClaudeEntry,
  auditStudio,
  planStudio,
  prepareStudio,
  SOURCE,
  RECEIPT,
} from '../../../../plugins/design-studio/scripts/bootstrap.mjs';
import { inspectEnvironment, validateSetupPlan } from '../../../../plugins/design-studio/scripts/setup-environment.mjs';

function fixture(t) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-plugin-test-')));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const source = path.join(temp, 'source');
  fs.mkdirSync(path.join(source, 'src/systems/studio'), { recursive: true });
  for (const file of ['AGENTS.md', 'pnpm-lock.yaml', 'mise.toml', 'studio.config.ts', 'src/systems/studio/AGENTS.md'])
    fs.writeFileSync(path.join(source, file), 'fixture');
  fs.writeFileSync(
    path.join(source, 'package.json'),
    JSON.stringify({ name: 'design-studio-starter', scripts: { dev: 'vite' } }),
  );
  const git = (...args) =>
    execFileSync('git', args, { cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '--initial-branch=main');
  git('add', '.');
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.test',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '-m',
    'Fixture',
  );
  return { temp, source, revision: git('rev-parse', 'HEAD'), destination: path.join(temp, 'My studio; literal $name') };
}

test('creates packaged visible source from pinned commit without an upstream remote', t => {
  const options = fixture(t);
  const result = createStudio({ ...options, name: 'My studio' });
  assert.equal(result.existing, false);
  assert.equal(result.revision, options.revision);
  assert.match(
    execFileSync('git', ['log', '-1', '--format=%s'], { cwd: options.destination, encoding: 'utf8' }),
    new RegExp(options.revision),
  );
  assert.equal(
    execFileSync('git', ['status', '--porcelain'], { cwd: options.destination, encoding: 'utf8' }).trim(),
    '',
  );
  assert.equal(execFileSync('git', ['remote'], { cwd: options.destination, encoding: 'utf8' }).trim(), '');
  assert.ok(fs.existsSync(path.join(options.destination, 'src/systems/studio/AGENTS.md')));
  assert.equal(inspectStudio(options.destination).name, 'My studio');
});

function observedEnvironment(overrides = {}) {
  return inspectEnvironment({
    env: {},
    platform: 'darwin',
    architecture: 'arm64',
    home: '/Users/designer',
    hostname: 'personal-computer',
    username: 'designer',
    exists: () => false,
    read: () => '',
    access: () => {},
    ...overrides,
  });
}

function accessOptions() {
  return { confirmation: 'Use the recommended location in the environment you described.' };
}

test('audit combines environment, available recommendation, and destination checks without writes', t => {
  const { temp, source, destination, revision } = fixture(t);
  const environment = observedEnvironment({ home: temp });
  const audit = auditStudio({}, environment);
  assert.equal(audit.environment, environment);
  assert.equal(audit.recommendation.destination, path.join(temp, 'Developer', 'design-studio'));
  assert.equal(audit.destinationCheck.available, true);
  assert.equal(fs.existsSync(path.join(temp, 'Developer')), false);
  const occupied = auditStudio({ destination: source }, environment);
  assert.equal(occupied.destinationCheck.available, false);
  assert.match(occupied.destinationCheck.reason, /occupied/);
  assert.equal(fs.existsSync(path.join(source, RECEIPT)), false);
  const invalid = auditStudio({ destination: 'relative-folder' }, environment);
  assert.equal(invalid.environment, environment);
  assert.equal(invalid.recommendation, null);
  assert.equal(invalid.destinationCheck.available, false);
  const created = createStudio({ source, destination, revision, name: 'Existing name' });
  assert.equal(auditStudio({ destination }, environment).recommendation.name, created.name);
});

test('CLI audit is read-only and plan automatically saves the confirmed destination', t => {
  const { temp } = fixture(t);
  const helper = path.resolve('plugins/design-studio/scripts/bootstrap.mjs');
  const destination = path.join(temp, 'chosen', 'studio');
  const audit = spawnSync(process.execPath, [helper, 'audit', '--destination', destination], { encoding: 'utf8' });
  assert.equal(audit.status, 0, audit.stderr);
  assert.equal(JSON.parse(audit.stdout).recommendation.destination, destination);
  assert.equal(JSON.parse(audit.stdout).destinationCheck.available, true);
  assert.equal(fs.existsSync(path.dirname(destination)), false);
  const result = spawnSync(
    process.execPath,
    [helper, 'plan', '--destination', destination, '--confirmation', 'Use the folder you showed.'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const saved = JSON.parse(result.stdout);
  t.after(() => fs.rmSync(path.dirname(saved.planFile), { recursive: true, force: true }));
  assert.equal(JSON.parse(fs.readFileSync(saved.planFile, 'utf8')).destination, destination);
  assert.equal(validateSetupPlan(JSON.parse(fs.readFileSync(saved.planFile, 'utf8'))).name, 'Design Studio');
  assert.equal(fs.existsSync(destination), false);
});

test('preflight reports observations without inferring locality or leaking environment values', () => {
  const mac = observedEnvironment();
  assert.equal(mac.filesystemLocation, 'requires user confirmation');
  assert.equal(mac.suggestedParent, '/Users/designer/Developer');
  assert.deepEqual(mac.homeAccess, { writable: true });
  const managed = observedEnvironment({
    access: () => {
      throw Object.assign(new Error('Denied'), { code: 'EACCES' });
    },
  });
  assert.deepEqual(managed.homeAccess, { writable: false, reason: 'EACCES' });
  const remote = observedEnvironment({
    platform: 'linux',
    home: '/home/ubuntu',
    env: { SSH_CONNECTION: 'private connection data', CODESPACES: 'true' },
  });
  assert.deepEqual(remote.signals, ['codespaces', 'ssh']);
  assert.equal(remote.suggestedParent, '/home/ubuntu/Projects');
  const windows = observedEnvironment({ platform: 'win32', home: 'C:\\Users\\designer' });
  assert.equal(windows.suggestedParent, 'C:\\Users\\designer\\Projects');
  assert.ok(!JSON.stringify(remote).includes('private connection data'));
  const container = observedEnvironment({ platform: 'linux', exists: file => file === '/.dockerenv' });
  assert.deepEqual(container.signals, ['container']);
  const wsl = observedEnvironment({ platform: 'linux', read: () => '6.6-microsoft-standard-WSL2' });
  assert.deepEqual(wsl.signals, ['wsl']);
});

test('plan requires user confirmation and allows an audited remote environment when explicitly chosen', t => {
  const { temp } = fixture(t);
  const destination = path.join(temp, 'new-parent', 'studio');
  const options = { ...accessOptions(), destination };
  assert.throws(() => planStudio({ destination }, observedEnvironment()), /must confirm/);
  assert.throws(() => planStudio(accessOptions(), observedEnvironment()), /exact user-confirmed destination/);
  assert.throws(() => planStudio({ ...options, confirmation: ' ' }, observedEnvironment()), /must confirm/);
  const remote = observedEnvironment({ platform: 'linux', env: { SSH_TTY: 'present' } });
  const plan = planStudio({ ...options, confirmation: 'Yes, install on the Linux host you described.' }, remote);
  assert.deepEqual(plan.environment.signals, ['ssh']);
  assert.equal(validateSetupPlan(plan, remote), plan);
  assert.equal(fs.existsSync(path.dirname(destination)), false);
});

test('folder suggestions use the audited home on each OS and preserve explicit locations', t => {
  const { temp } = fixture(t);
  const mac = observedEnvironment({ home: temp });
  const first = chooseStudioLocation({ parent: mac.suggestedParent });
  assert.equal(first.destination, path.join(temp, 'Developer', 'design-studio'));
  assert.equal(fs.existsSync(path.join(temp, 'Developer')), false);
  fs.mkdirSync(first.destination, { recursive: true });
  const next = chooseStudioLocation({ parent: mac.suggestedParent });
  assert.equal(next.name, 'Design Studio 2');
  const linux = observedEnvironment({ platform: 'linux', home: temp });
  assert.equal(
    chooseStudioLocation({ parent: linux.suggestedParent }).destination,
    path.join(temp, 'Projects', 'design-studio'),
  );
  const explicit = planStudio({ ...accessOptions(), name: 'My Studio', destination: path.join(temp, 'chosen') }, linux);
  assert.equal(explicit.destination, path.join(temp, 'chosen'));
});

test('plan rechecks environment identity and newly introduced remote signals', t => {
  const { temp } = fixture(t);
  const environment = observedEnvironment();
  const plan = planStudio({ ...accessOptions(), destination: path.join(temp, 'chosen') }, environment);
  assert.equal(validateSetupPlan(plan, environment), plan);
  for (const changed of ['home', 'hostname', 'username', 'architecture']) {
    assert.throws(() => validateSetupPlan(plan, { ...environment, [changed]: 'different' }), /environment changed/);
  }
  assert.throws(() => validateSetupPlan(plan, { ...environment, signals: ['container'] }), /environment changed/);
});

test('destination validation preserves unrelated folders and rejects linked ancestors before mkdir', t => {
  const { temp, source } = fixture(t);
  assert.throws(
    () => planStudio({ ...accessOptions(), destination: source }, observedEnvironment()),
    /occupied.*preserved/,
  );
  const linked = path.join(temp, 'linked');
  fs.symlinkSync(source, linked);
  const destination = path.join(linked, 'missing-parent', 'studio');
  assert.throws(() => planStudio({ ...accessOptions(), destination }, observedEnvironment()), /not links/);
  assert.equal(fs.existsSync(path.join(source, 'missing-parent')), false);
});

test('CLI requires a plan and rejects old setup flags before any creation', t => {
  const { temp } = fixture(t);
  const destination = path.join(temp, 'untouched');
  const helper = path.resolve('plugins/design-studio/scripts/bootstrap.mjs');
  for (const args of [['create', '--destination', destination], ['setup'], ['setup', '--destination', destination]]) {
    const result = spawnSync(process.execPath, [helper, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /plan is required|Invalid option/);
  }
  assert.equal(fs.existsSync(destination), false);
  const preflight = spawnSync(process.execPath, [helper, 'preflight'], { encoding: 'utf8' });
  assert.equal(preflight.status, 0);
  assert.equal(JSON.parse(preflight.stdout).filesystemLocation, 'requires user confirmation');
});

test('saved plan creation, reuse, and destination mismatch checks preserve work', t => {
  const options = fixture(t);
  const environment = inspectEnvironment();
  const plan = planStudio(
    { ...accessOptions(), destination: options.destination, name: ' Design Studio ' },
    environment,
  );
  assert.equal(plan.name, 'Design Studio');
  // A local source fixture exercises the same plan validation without a network download.
  const first = createStudio({ ...options, plan });
  assert.equal(first.destination, plan.destination);
  const settings = path.join(first.destination, 'studio.config.ts');
  fs.writeFileSync(settings, 'user edits');
  assert.equal(createStudio({ ...options, plan }).existing, true);
  assert.throws(() => createStudio({ ...options, destination: path.join(options.temp, 'other'), plan }), /differs/);
  assert.equal(fs.readFileSync(settings, 'utf8'), 'user edits');
  assert.equal(fs.existsSync(path.join(options.temp, 'other')), false);
  // An interrupted official-source install cannot prepare without its checked plan.
  const receipt = path.join(first.destination, RECEIPT);
  fs.writeFileSync(receipt, JSON.stringify({ ...first, source: SOURCE }));
  assert.throws(() => prepareStudio(first.destination), /valid setup plan/);
  assert.throws(() => createStudio({ destination: first.destination }), /valid setup plan/);
});

test('CLI plan file is exclusive, bound to the environment, and kept outside the destination', t => {
  const { temp } = fixture(t);
  const helper = path.resolve('plugins/design-studio/scripts/bootstrap.mjs');
  const destination = path.join(temp, 'studio');
  const output = path.join(temp, 'setup-plan.json');
  const args = [
    helper,
    'plan',
    '--confirmation',
    'Use the folder you recommended after the audit.',
    '--destination',
    destination,
    '--output',
    output,
  ];
  const planned = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(planned.status, 0, planned.stderr);
  assert.equal(fs.existsSync(destination), false);
  const original = fs.readFileSync(output, 'utf8');
  assert.equal(spawnSync(process.execPath, args, { encoding: 'utf8' }).status, 1);
  assert.equal(fs.readFileSync(output, 'utf8'), original);
  const invalid = spawnSync(process.execPath, [helper, 'create', '--plan', output, '--destination', destination], {
    encoding: 'utf8',
  });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /--plan alone/);
  const remote = spawnSync(process.execPath, [helper, 'setup', '--plan', output], {
    encoding: 'utf8',
    env: { ...process.env, SSH_CONNECTION: 'test' },
  });
  assert.equal(remote.status, 1);
  assert.match(remote.stderr, /environment changed/);
  assert.equal(fs.existsSync(destination), false);
});

test('repeat setup preserves source and configuration edits', t => {
  const options = fixture(t);
  createStudio(options);
  const file = path.join(options.destination, 'studio.config.ts');
  fs.writeFileSync(file, 'my configuration');
  assert.equal(createStudio({ ...options, name: 'Replacement' }).existing, true);
  assert.equal(fs.readFileSync(file, 'utf8'), 'my configuration');
  assert.equal(inspectStudio(options.destination).name, 'Design Studio');
});

test('additional studios are numbered while existing names and edits survive', t => {
  const options = fixture(t);
  const parent = path.join(options.temp, 'Developer');
  for (const name of ['Design Studio', 'Design Studio 2', 'Design Studio 3']) {
    const chosen = chooseStudioLocation({ parent });
    assert.equal(chosen.name, name);
    assert.equal(chosen.destination, path.join(parent, studioFolderName(name)));
    assert.equal(createStudio({ ...options, ...chosen }).name, name);
    fs.writeFileSync(path.join(chosen.destination, 'studio.config.ts'), `custom ${name}`);
  }
  const first = path.join(parent, 'design-studio');
  const receiptPath = path.join(first, RECEIPT);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  fs.writeFileSync(receiptPath, JSON.stringify({ ...receipt, name: 'Acme Studio' }));
  assert.equal(createStudio({ ...options, destination: first }).name, 'Acme Studio');
  assert.equal(fs.readFileSync(path.join(first, 'studio.config.ts'), 'utf8'), 'custom Design Studio');
  assert.equal(chooseStudioLocation({ parent }).name, 'Design Studio 4');
});

test('selection skips unrelated folders and dangling links without writing', t => {
  const options = fixture(t);
  const parent = path.join(options.temp, 'Developer');
  assert.equal(chooseStudioLocation({ parent }).name, 'Design Studio');
  assert.equal(fs.existsSync(parent), false);
  fs.mkdirSync(path.join(parent, 'design-studio'), { recursive: true });
  fs.writeFileSync(path.join(parent, 'design-studio', 'important.txt'), 'keep');
  fs.symlinkSync(path.join(options.temp, 'missing'), path.join(parent, 'design-studio-2'));
  const output = execFileSync(
    process.execPath,
    [path.resolve('plugins/design-studio/scripts/bootstrap.mjs'), 'choose', '--parent', parent],
    { encoding: 'utf8' },
  );
  assert.deepEqual(JSON.parse(output), { name: 'Design Studio 3', destination: path.join(parent, 'design-studio-3') });
  assert.deepEqual(fs.readdirSync(parent), ['design-studio', 'design-studio-2']);
  assert.equal(fs.readFileSync(path.join(parent, 'design-studio', 'important.txt'), 'utf8'), 'keep');
  assert.throws(() => chooseStudioLocation({ parent: 'relative' }), /absolute/);
});

test('refuses unrelated existing folders and preserves their files', t => {
  const options = fixture(t);
  fs.mkdirSync(options.destination);
  fs.writeFileSync(path.join(options.destination, 'important.txt'), 'keep');
  assert.throws(() => createStudio(options));
  assert.equal(fs.readFileSync(path.join(options.destination, 'important.txt'), 'utf8'), 'keep');
});

test('refuses cache paths, relative paths, linked destinations and parents', t => {
  const options = fixture(t);
  assert.throws(() => destinationPath('relative/studio'));
  assert.throws(() => destinationPath('/Users/designer/.codex/plugins/studio'));
  assert.throws(() => destinationPath('/Users/designer/.claude/plugins/studio'));
  assert.throws(() => destinationPath('/Users/designer/.cursor/plugins/studio'));
  const linked = path.join(options.temp, 'linked');
  fs.symlinkSync(options.source, linked);
  assert.throws(() => createStudio({ ...options, destination: linked }));
  assert.throws(() => createStudio({ ...options, destination: path.join(linked, 'new-studio') }));
});

test('Claude entry imports shared instructions and preserves custom entries', t => {
  const options = fixture(t);
  createStudio(options);
  ensureClaudeEntry(options.destination);
  const entry = path.join(options.destination, 'CLAUDE.md');
  assert.equal(fs.readFileSync(entry, 'utf8'), '@AGENTS.md\n');
  fs.writeFileSync(
    entry,
    '# Design Studio\n\nRead and follow [repository instructions](AGENTS.md) before work. Project skills route to their canonical sources.\n',
  );
  ensureClaudeEntry(options.destination);
  assert.equal(fs.readFileSync(entry, 'utf8'), '@AGENTS.md\n');
  fs.writeFileSync(entry, 'Personal instructions\n@AGENTS.md\n');
  ensureClaudeEntry(options.destination);
  assert.equal(fs.readFileSync(entry, 'utf8'), 'Personal instructions\n@AGENTS.md\n');
});

test('failed fetch leaves no destination or staging folder', t => {
  const options = fixture(t);
  assert.throws(() => createStudio({ ...options, revision: 'f'.repeat(40) }));
  assert.equal(fs.existsSync(options.destination), false);
  assert.deepEqual(fs.readdirSync(options.temp), ['source']);
});

test('invalid or linked receipt cannot resume setup', t => {
  const options = fixture(t);
  createStudio(options);
  const receipt = path.join(options.destination, RECEIPT);
  fs.writeFileSync(receipt, '{}');
  assert.throws(() => inspectStudio(options.destination));
  fs.unlinkSync(receipt);
  fs.symlinkSync(path.join(options.source, 'package.json'), receipt);
  assert.throws(() => inspectStudio(options.destination));
});

test('interrupted setup preserves user settings before applying defaults', t => {
  const options = fixture(t);
  createStudio(options);
  const studio = inspectStudio(options.destination);
  checkInitialConfiguration(studio);
  fs.writeFileSync(path.join(options.destination, 'studio.config.ts'), 'user settings');
  assert.throws(() => checkInitialConfiguration(studio), /preserved/);
  assert.equal(fs.readFileSync(path.join(options.destination, 'studio.config.ts'), 'utf8'), 'user settings');
  checkInitialConfiguration({ ...studio, prepared: true });
});

test('refuses linked Git metadata when reopening a studio', t => {
  const options = fixture(t);
  createStudio(options);
  const metadata = path.join(options.destination, '.git');
  fs.rmSync(metadata, { recursive: true });
  fs.symlinkSync(path.join(options.source, '.git'), metadata);
  assert.throws(() => inspectStudio(options.destination), /ordinary local Git/);
});

test('custom display names choose kebab-case folders without changing supplied destinations', t => {
  const { temp } = fixture(t);
  const parent = path.join(temp, 'Developer');
  assert.deepEqual(chooseStudioLocation({ parent, name: 'Acme Design Lab' }), {
    name: 'Acme Design Lab',
    destination: path.join(parent, 'acme-design-lab'),
  });
  fs.mkdirSync(path.join(parent, 'acme-design-lab'), { recursive: true });
  assert.deepEqual(chooseStudioLocation({ parent, name: 'Acme Design Lab' }), {
    name: 'Acme Design Lab 2',
    destination: path.join(parent, 'acme-design-lab-2'),
  });
  assert.equal(studioFolderName('  Café / Design__Lab  '), 'cafe-design-lab');
  assert.equal(studioFolderName('工作室'), 'design-studio');
  assert.throws(() => studioFolderName('   '), /studio name/);
  fs.mkdirSync(path.join(parent, 'Design Studio'));
  assert.equal(chooseStudioLocation({ parent }).destination, path.join(parent, 'design-studio'));
  assert.ok(fs.existsSync(path.join(parent, 'Design Studio')));
});
