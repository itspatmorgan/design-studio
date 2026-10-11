import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resourceIdentityChangeProblems } from './resource-identity-changes.js';
import { gitResourceIdentities } from './git-resource-identities.js';
import { markdownIdentity } from '../../src/platform/core/resourceIdentity.ts';

const owner = '0123456789abcdef',
  parent = 'abcdefghjkmnpqrs',
  artifact = '23456789abcdefgh',
  secondParent = '3456789abcdefghj',
  replacement = '456789abcdefghjk';
const report = resources => ({ resources, problems: [], missing: [] });
const prototype = (id = parent, folder = 'example', ownerContributorId = owner) => ({
  kind: 'prototype',
  studioId: id,
  path: `src/prototypes/pat/${folder}/meta.json`,
  ownerContributorId,
});
const item = (name = 'notes.md', folder = 'example', id = artifact) => ({
  kind: 'artifact',
  studioId: id,
  path: `src/prototypes/pat/${folder}/${name}`,
  parent: `src/prototypes/pat/${folder}`,
});

test('identity change policy preserves moves and copies but rejects replacement, ownership mutation and transfer', () => {
  const before = report([prototype(), item()]);
  assert.deepEqual(
    resourceIdentityChangeProblems(before, report([prototype(parent, 'renamed'), item('nested/notes.md', 'renamed')])),
    [],
  );
  assert.deepEqual(
    resourceIdentityChangeProblems(
      before,
      report([prototype(), item(), prototype(secondParent, 'copy'), item('notes.md', 'copy', replacement)]),
    ),
    [],
  );
  assert.match(
    resourceIdentityChangeProblems(before, report([prototype(), item('notes.md', 'example', replacement)])).join('\n'),
    /cannot be replaced/,
  );
  assert.match(
    resourceIdentityChangeProblems(before, report([prototype(parent, 'example', replacement), item()])).join('\n'),
    /owner identity/,
  );
  assert.match(
    resourceIdentityChangeProblems(
      before,
      report([prototype(), prototype(secondParent, 'copy'), item('notes.md', 'copy')]),
    ).join('\n'),
    /transfer policy/,
  );
  assert.match(
    resourceIdentityChangeProblems(before, report([{ ...prototype(), ownerContributorId: undefined }, item()])).join(
      '\n',
    ),
    /ownerContributorId/,
  );
  assert.match(
    resourceIdentityChangeProblems(before, report([{ ...prototype(), kind: 'system' }, item()])).join('\n'),
    /resource kind/,
  );
  assert.deepEqual(resourceIdentityChangeProblems(before, report([])), []);
});

test('swapping named artifacts retains both identities while deleting identity metadata in place fails', () => {
  const before = report([prototype(), item(), item('other.md', 'example', replacement)]);
  assert.deepEqual(
    resourceIdentityChangeProblems(
      before,
      report([prototype(), item('other.md'), item('notes.md', 'example', replacement)]),
    ),
    [],
  );
  assert.match(
    resourceIdentityChangeProblems(
      before,
      report([prototype(), { ...item(), studioId: null }, item('other.md', 'example', replacement)]),
    ).join('\n'),
    /removed in place/,
  );
});

test('Git inventories inspect their own tree and staged blobs, including retained IDs and owner relationships', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-git-inventory-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = args =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' },
    }).trim();
  git(['init', '-q']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'user.email', 'fixture@example.test']);
  const write = (relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  write('contributors/pat.json', JSON.stringify({ studioId: owner, name: 'Pat' }));
  write('studio.config.ts', "export default { usage: 'personal' };");
  write(
    'src/prototypes/pat/example/meta.json',
    JSON.stringify({ studioId: parent, ownerId: owner, title: 'Example', status: 'archived' }),
  );
  write('src/prototypes/pat/example/notes.md', `---\nstudioId: ${artifact}\n---\n# Notes\n`);
  write('src/prototypes/pat/example/_helper.md', `---\nstudioId: ${artifact}\n---\n`);
  git(['add', '.']);
  git(['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Before']);
  const baseline = git(['rev-parse', 'HEAD']);
  const types = { document: { inPrototype: true, extensions: ['.md'], identity: markdownIdentity } };
  const before = gitResourceIdentities('HEAD', types, { cwd: root, legacyOwnership: true });
  assert.equal(before.resources.length, 3);
  assert.deepEqual(before.problems, []);
  assert.equal(before.resources.find(resource => resource.kind === 'prototype').ownerContributorId, owner);
  write(
    'src/prototypes/pat/example/meta.json',
    JSON.stringify({
      studioId: parent,
      ownerContributorId: owner,
      systemId: null,
      title: 'Example',
      status: 'archived',
    }),
  );
  git(['add', 'src/prototypes/pat/example/meta.json']);
  write('src/prototypes/pat/example/notes.md', `---\nstudioId: ${replacement}\n---\n# Edited\n`);
  git(['add', 'src/prototypes/pat/example/notes.md']);
  write('src/prototypes/pat/example/notes.md', `---\nstudioId: ${artifact}\n---\n# Unstaged\n`);
  const staged = gitResourceIdentities(null, types, { cwd: root, staged: true });
  assert.match(resourceIdentityChangeProblems(before, staged).join('\n'), /cannot be replaced/);
  assert.deepEqual(gitResourceIdentities('HEAD', types, { cwd: root, legacyOwnership: true }), before);
  git(['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Replace artifact identity']);
  const check = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../check/check-scope.js', import.meta.url)),
      '--ci',
      baseline,
      git(['rev-parse', 'HEAD']),
      '--review',
    ],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(check.status, 1, check.stderr + check.stdout);
  assert.match(check.stderr, /permanent identity cannot be replaced/);
  assert.ok(!check.stdout.includes('team ownership checks are skipped'));
});

test('CI resolves persisted grants from the before-side identity directory and proposed Admin grants do not authorize themselves', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-id-authority-ci-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const write = (relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  git(['init', '-q']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'user.email', 'fixture@example.test']);
  write('contributors/pat.json', JSON.stringify({ studioId: owner, name: 'Pat', github: 'pat-fixture', email: '' }));
  write(
    'contributors/member.json',
    JSON.stringify({ studioId: replacement, name: 'Member', github: 'member-fixture', email: '' }),
  );
  write(
    'src/systems/product/system.ts',
    `export default { studioId:'${secondParent}', role:'prototype', status:'active' };`,
  );
  const config = {
    usage: 'team',
    systems: ['product'],
    defaultSystem: secondParent,
    admins: [owner],
    systemMaintainers: { [secondParent]: [replacement] },
  };
  write('studio.config.ts', 'export default ' + JSON.stringify(config) + ';');
  const commit = message => {
    git(['add', '.']);
    git(['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', message]);
    return git(['rev-parse', 'HEAD']);
  };
  const baseline = commit('Persisted authority');
  write('src/systems/product/components/button.tsx', 'export default () => null;');
  const assignedWork = commit('Assigned system work');
  const check = (before, after) =>
    spawnSync(
      process.execPath,
      [fileURLToPath(new URL('../check/check-scope.js', import.meta.url)), '--ci', before, after],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, STUDIO_SCOPE_ACTOR: 'member-fixture', STUDIO_PLATFORM_ROLE: 'write' },
      },
    );
  const allowed = check(baseline, assignedWork);
  assert.equal(allowed.status, 0, allowed.stderr + allowed.stdout);
  config.admins.push(replacement);
  write('studio.config.ts', 'export default ' + JSON.stringify(config) + ';');
  write('src/platform/fixture.md', '# Proposed shared work');
  const elevated = commit('Proposed elevation');
  const denied = check(assignedWork, elevated);
  assert.equal(denied.status, 1, denied.stderr + denied.stdout);
  assert.match(denied.stdout, /studio.config.ts/);
  assert.match(denied.stdout, /src\/platform\/fixture.md/);
});

test('missing IDs in proposed retained resources fail even when no previous resource existed', () => {
  const proposed = { ...report([{ ...item(), studioId: null }]), missing: ['src/prototypes/pat/example/notes.md'] };
  assert.match(resourceIdentityChangeProblems(report([]), proposed).join('\n'), /permanent identity is missing/);
});

test('the first repository commit has no before-side grants to authorize itself', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-first-commit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'user.email', 'fixture@example.test']);
  fs.mkdirSync(path.join(root, 'contributors'));
  fs.writeFileSync(
    path.join(root, 'contributors/pat.json'),
    JSON.stringify({ studioId: owner, name: 'Pat', github: 'pat-fixture' }),
  );
  fs.writeFileSync(path.join(root, 'studio.config.ts'), "export default {usage:'personal'};");
  git(['add', '.']);
  git(['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Initial']);
  const head = git(['rev-parse', 'HEAD']);
  const check = role =>
    spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('../check/check-scope.js', import.meta.url)),
        '--ci',
        '0000000000000000000000000000000000000000',
        head,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, STUDIO_SCOPE_ACTOR: 'pat-fixture', STUDIO_PLATFORM_ROLE: role },
      },
    );
  assert.equal(check('write').status, 1);
  const accepted = check('maintain');
  assert.equal(accepted.status, 0, accepted.stderr + accepted.stdout);
  assert.ok(!accepted.stdout.includes('team ownership checks are skipped'));
});
