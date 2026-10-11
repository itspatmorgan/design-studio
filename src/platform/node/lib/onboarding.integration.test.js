import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { writeFixtureConfig } from './fixtures/identities.js';
import { writeProfiles, ensureTeamManagement } from './fixtures/contributors.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { readDeclaration } from '../../core/modules/pack.ts';
import { moduleIdsIn } from './module-folders.js';

test('local personal setup resumes, then a second clone joins a team without changing configuration', () => {
  const root = path.resolve('.');
  const hasDocumentation = fs.existsSync(path.join(root, 'src/platform/modules/documentation/module.ts'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-onboarding-'));
  const clone = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-contributor-'));
  const copy = (from, to) => {
    fs.cpSync(from, to, {
      recursive: true,
      filter: file => !['.git', 'node_modules', 'dist'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(to, 'node_modules'));
    linkSystemDependencies(root, to);
  };
  const run = (cwd, file, ...args) =>
    execFileSync(process.execPath, [file, ...args], {
      cwd,
      encoding: 'utf8',
      timeout: 30000,
      stdio: 'pipe',
      env: { ...process.env, MISE_TRUSTED_CONFIG_PATHS: cwd },
    });
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  try {
    copy(root, dir);
    ensureTeamManagement(dir);
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.name', 'Sam Rivera');
    git(dir, 'config', 'user.email', 'legacy@example.test');
    // Own the fixture data: a team's real contributors, systems and prototypes are arbitrary.
    fs.rmSync(path.join(dir, 'contributors'), { recursive: true, force: true });
    writeProfiles(dir, {
      samples: { studioId: '0123456789abcdef', name: 'Sam Rivera', email: '', github: '', welcomeDismissed: false },
    });
    for (const folder of ['src/prototypes', 'src/systems']) {
      fs.rmSync(path.join(dir, folder), { recursive: true, force: true });
      fs.mkdirSync(path.join(dir, folder), { recursive: true });
    }
    for (const file of fs
      .globSync('**/*', { cwd: path.join(root, 'src/platform/node/templates/system') })
      .filter(file => fs.statSync(path.join(root, 'src/platform/node/templates/system', file)).isFile())) {
      const target = path.join(dir, 'src/systems/bootstrap', file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(
        target,
        fs
          .readFileSync(path.join(root, 'src/platform/node/templates/system', file), 'utf8')
          .replaceAll('__ID__', 'bootstrap')
          .replaceAll('__LABEL__', 'Bootstrap'),
      );
    }
    fs.mkdirSync(path.join(dir, 'src/systems/bootstrap/components'), { recursive: true });
    writeFixtureConfig(dir, {
      name: 'Fixture Studio',
      usage: 'team',
      admins: ['samples'],
      tagline: 'Fixture',
      modules: Object.fromEntries(moduleIdsIn(dir).map(id => [id, id !== 'documentation'])),
      systems: ['bootstrap'],
      systemMaintainers: { bootstrap: [] },
      defaultSystem: 'bootstrap',
    });
    run(dir, 'src/platform/node/cli/studio.js', 'create-system', 'product', '--label', 'Product', '--yes');
    assert.match(fs.readFileSync(path.join(dir, 'pnpm-lock.yaml'), 'utf8'), /src\/systems\/product:/);
    run(dir, 'src/platform/node/cli/studio.js', 'configure', '--system', 'product', '--yes');
    run(dir, 'src/platform/node/cli/studio.js', 'remove', 'bootstrap', '--yes');
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'pnpm-lock.yaml'), 'utf8'), /src\/systems\/bootstrap:/);
    const declared = () => JSON.parse(fs.readFileSync(path.join(dir, 'studio.config.json'), 'utf8'));
    assert.deepEqual(declared().systems, ['product']);
    const teamConfig = fs.readFileSync(path.join(dir, 'studio.config.json'), 'utf8');
    for (const args of [
      ['disable', 'contributors'],
      ['remove', 'contributors', '--yes'],
    ]) {
      const denied = spawnSync(process.execPath, ['src/platform/node/cli/studio.js', ...args], {
        cwd: dir,
        encoding: 'utf8',
      });
      assert.equal(denied.status, 1);
      assert.match(denied.stderr, /[Tt]eam use requires/);
      assert.equal(fs.readFileSync(path.join(dir, 'studio.config.json'), 'utf8'), teamConfig);
      assert.ok(fs.existsSync(path.join(dir, 'src/platform/modules/contributors/module.ts')));
    }
    const required = spawnSync(process.execPath, ['src/platform/node/cli/studio.js', 'remove', 'studio', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
    });
    assert.equal(required.status, 1);
    assert.match(required.stderr, /cannot be removed/);
    assert.ok(fs.existsSync(path.join(dir, 'src/platform/systems/studio/system.ts')));
    // One successful lifecycle journey complements the rollback below. Keep it
    // separate from prototype authoring rather than duplicating full builds.
    run(dir, 'src/platform/node/cli/studio.js', 'create-module', 'lifecycle-fixture', '--yes');
    assert.equal(declared().modules['lifecycle-fixture'], true);
    // New modules are made in the team root, never beside the supplied ones.
    assert.ok(fs.existsSync(path.join(dir, 'src/modules/lifecycle-fixture/module.ts')));
    assert.ok(!fs.existsSync(path.join(dir, 'src/platform/modules/lifecycle-fixture')));
    // A team module can't take a supplied module's id, and a supplied module is removed from its own root.
    const reused = spawnSync(process.execPath, ['src/platform/node/cli/studio.js', 'create-module', 'view', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
    });
    assert.equal(reused.status, 1);
    assert.match(reused.stderr, /already a module called "view"/);
    assert.ok(!fs.existsSync(path.join(dir, 'src/modules/view')));
    run(dir, 'src/platform/node/cli/studio.js', 'disable', 'lifecycle-fixture');
    assert.equal(declared().modules['lifecycle-fixture'], false);
    run(dir, 'src/platform/node/cli/studio.js', 'enable', 'lifecycle-fixture');
    assert.equal(declared().modules['lifecycle-fixture'], true);
    run(dir, 'src/platform/node/cli/studio.js', 'remove', 'lifecycle-fixture', '--yes');
    assert.equal(Object.hasOwn(declared().modules, 'lifecycle-fixture'), false);
    assert.ok(!fs.existsSync(path.join(dir, 'src/modules/lifecycle-fixture')));
    const beforeFailedInstall = fs.readFileSync(path.join(dir, 'studio.config.json'), 'utf8');
    const pack = path.join(dir, 'failing-pack');
    fs.mkdirSync(pack);
    fs.writeFileSync(
      path.join(pack, 'module.ts'),
      "export default { id: 'failing-fixture', label: 'Failing fixture', version: '0.1.0', optional: true, lib: false };\n",
    );
    fs.writeFileSync(path.join(pack, 'check.ts'), "export default () => ['Deliberate fixture failure'];\n");
    assert.throws(() => run(dir, 'src/platform/node/cli/studio.js', 'add', pack, '--yes'), /Command failed/);
    assert.equal(fs.readFileSync(path.join(dir, 'studio.config.json'), 'utf8'), beforeFailedInstall);
    assert.equal(fs.existsSync(path.join(dir, 'src/modules/failing-fixture')), false);
    fs.writeFileSync(path.join(pack, 'check.ts'), 'export default () => [];\n');
    run(dir, 'src/platform/node/cli/studio.js', 'add', pack, '--yes');
    assert.equal(declared().modules['failing-fixture'], true);
    run(dir, 'src/platform/node/cli/studio.js', 'remove', 'failing-fixture', '--yes');
    fs.rmSync(pack, { recursive: true });
    assert.equal(run(dir, 'src/platform/node/cli/resolve-contributor.js').trim(), 'samples');
    run(dir, 'src/platform/modules/prototypes/node/create.js', 'Sample');
    git(dir, 'config', 'user.name', 'Sam Solo');
    git(dir, 'config', 'user.email', 'sam@gmail.com');
    assert.equal(
      spawnSync(process.execPath, ['src/platform/node/cli/resolve-contributor.js'], { cwd: dir, encoding: 'utf8' })
        .status,
      1,
    );
    const config = path.join(dir, 'studio.config.json');
    const before = fs.readFileSync(config, 'utf8');
    run(dir, 'src/platform/node/cli/studio.js', 'configure', '--name', 'Personal Studio', '--usage', 'personal');
    assert.equal(fs.readFileSync(config, 'utf8'), before);
    const invalid = spawnSync(
      process.execPath,
      ['src/platform/node/cli/studio.js', 'configure', '--usage', 'unknown', '--yes'],
      {
        cwd: dir,
        encoding: 'utf8',
      },
    );
    assert.equal(invalid.status, 1);
    assert.equal(fs.readFileSync(config, 'utf8'), before);
    run(
      dir,
      'src/platform/node/cli/studio.js',
      'configure',
      '--name',
      'Personal Studio',
      '--usage',
      'personal',
      '--yes',
      '--recovery',
    );
    const join = ['--key', 'sam', '--name', 'Sam Solo', '--email', 'sam@gmail.com', '--yes'];
    assert.doesNotMatch(run(dir, 'src/platform/node/cli/setup-contributor.js', ...join), /Warning:/);
    const profile = path.join(dir, 'contributors/sam.json');
    const registered = JSON.parse(fs.readFileSync(profile, 'utf8'));
    assert.equal(registered.welcomeDismissed, false);
    fs.writeFileSync(profile, JSON.stringify({ ...registered, welcomeDismissed: true }));
    const contributor = fs.readFileSync(profile, 'utf8');
    assert.match(run(dir, 'src/platform/node/cli/setup-contributor.js', ...join), /already/);
    assert.equal(fs.readFileSync(path.join(dir, 'contributors/sam.json'), 'utf8'), contributor);
    assert.equal(run(dir, 'src/platform/node/cli/resolve-contributor.js').trim(), 'sam');
    run(dir, 'src/platform/node/cli/studio.js', 'create-system', 'acme', '--label', 'Acme', '--yes');
    run(dir, 'src/platform/node/cli/studio.js', 'configure', '--system', 'acme', '--yes');
    const components = path.join(dir, 'src/systems/acme/components/button');
    fs.mkdirSync(components, { recursive: true });
    fs.writeFileSync(path.join(components, 'index.tsx'), 'export function Button(){return <button>Continue</button>}');
    const script = `import {createPrototype} from './src/platform/modules/prototypes/node/create.js'; import fs from 'node:fs'; const {slug}=createPrototype({title:'First Flow',key:'sam'}); const dir='src/prototypes/sam/'+slug; const header=fs.readFileSync(dir+'/prototype.tsx','utf8').split('\\n')[0]; fs.writeFileSync(dir+'/prototype.tsx',header+'\\nimport { Button } from \"@/systems/acme/components/button\"; export default function View(){return <Button/>}'); fs.writeFileSync(dir+'/context.md','# First flow\\nA local setup example.'); fs.writeFileSync(dir+'/flow.excalidraw',JSON.stringify({type:'excalidraw',version:2,elements:[],appState:{},files:{}}));`;
    execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
      cwd: dir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    run(dir, 'src/platform/node/cli/studio.js', 'identify', 'src/prototypes/sam/first-flow', '--yes');
    run(dir, 'src/platform/node/build/build-manifest.js', '--strict');
    const status = JSON.parse(run(dir, 'src/platform/node/cli/studio.js', 'status', '--json'));
    assert.equal(status.config.defaultSystem, 'acme');
    assert.equal(status.contributor, 'sam');
    assert.equal(status.modules.disabled.includes('documentation'), hasDocumentation);
    // Retire the sample's dependency in this disposable copy only, before replacing Product.
    fs.rmSync(path.join(dir, 'src/prototypes/samples'), { recursive: true, force: true });
    run(dir, 'src/platform/node/cli/studio.js', 'remove', 'product', '--yes');
    run(dir, 'src/platform/node/build/build-manifest.js', '--strict');
    run(dir, 'src/platform/node/cli/studio.js', 'configure', '--usage', 'team', '--yes');
    copy(dir, clone);
    git(clone, 'init', '-q');
    git(clone, 'config', 'user.name', 'Alex Partner');
    git(clone, 'config', 'user.email', 'alex@example.test');
    const sharedConfig = fs.readFileSync(path.join(clone, 'studio.config.json'), 'utf8');
    run(
      clone,
      'src/platform/node/cli/setup-contributor.js',
      '--key',
      'alex',
      '--name',
      'Alex Partner',
      '--email',
      'alex@example.test',
      '--github',
      'alex-test',
      '--yes',
    );
    assert.equal(run(clone, 'src/platform/node/cli/resolve-contributor.js').trim(), 'alex');
    assert.equal(fs.readFileSync(path.join(clone, 'studio.config.json'), 'utf8'), sharedConfig);
    assert.equal(fs.readFileSync(path.join(clone, 'contributors/sam.json'), 'utf8'), contributor);
    for (const args of [
      ['create-system', 'unauthorized', '--yes'],
      ['configure', '--admins', 'alex', '--yes'],
      ['configure', '--admins', 'alex', '--out', 'unused', '--yes'],
    ]) {
      const denied = spawnSync(process.execPath, ['src/platform/node/cli/studio.js', ...args], {
        cwd: clone,
        encoding: 'utf8',
      });
      assert.equal(denied.status, 1);
      assert.match(denied.stderr, /Only an Admin/);
      assert.equal(fs.readFileSync(path.join(clone, 'studio.config.json'), 'utf8'), sharedConfig);
    }
    const assigned = JSON.parse(sharedConfig);
    const acmeId = readDeclaration(fs.readFileSync(path.join(clone, 'src/systems/acme/system.ts'), 'utf8')).value
      .studioId;
    const alexId = JSON.parse(fs.readFileSync(path.join(clone, 'contributors/alex.json'))).studioId;
    assigned.systemMaintainers[acmeId] = [alexId];
    fs.writeFileSync(path.join(clone, 'studio.config.json'), JSON.stringify(assigned));
    const packageIdentity = JSON.parse(fs.readFileSync(path.join(clone, 'src/systems/acme/package.json'))).name;
    run(clone, 'src/platform/node/cli/studio.js', 'rename-system', 'acme', '--label', 'Partner System', '--yes');
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(clone, 'src/systems/partner-system/package.json'))).name,
      packageIdentity,
    );
    const renamedLock = fs.readFileSync(path.join(clone, 'pnpm-lock.yaml'), 'utf8');
    assert.match(renamedLock, /src\/systems\/partner-system:/);
    assert.doesNotMatch(renamedLock, /src\/systems\/acme:/);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(clone, 'studio.config.json'), 'utf8')).systemMaintainers[acmeId],
      [alexId],
    );
    const collision = spawnSync(
      process.execPath,
      [
        'src/platform/node/cli/setup-contributor.js',
        '--key',
        'wrong',
        '--name',
        'Wrong',
        '--email',
        'alex@example.test',
        '--yes',
      ],
      { cwd: clone, encoding: 'utf8' },
    );
    assert.equal(collision.status, 1);
    assert.equal(fs.existsSync(path.join(clone, 'contributors/wrong.json')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(clone, { recursive: true, force: true });
  }
});
