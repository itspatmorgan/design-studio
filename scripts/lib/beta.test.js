import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { writeProfiles, ensureTeamManagement } from './fixtures/contributors.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { personAddress, moveWithLinks } from './prototype-links.js';
import { archiveEntries, extractArchive, boundedDownload } from './source-archive.js';
import importGuard from '../build/vite-import-guard-plugin.js';

function tar(name, type = '0', data = Buffer.from('hello')) {
  const header = Buffer.alloc(512);
  header.write(name);
  header.write('0000644\0', 100);
  header.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
  header.fill(32, 148, 156);
  header.write(type, 156);
  header.write('ustar\0', 257);
  const sum = header.reduce((a, b) => a + b, 0);
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return gzipSync(Buffer.concat([header, data, Buffer.alloc((512 - (data.length % 512)) % 512), Buffer.alloc(1024)]));
}

test('rename migrates canonical and legacy links without changing external URLs or longer slugs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-links-'));
  try {
    const from = path.join(dir, 'old'),
      to = path.join(dir, 'new');
    fs.mkdirSync(from);
    fs.writeFileSync(path.join(from, 'meta.json'), '{"title":"Old"}');
    fs.writeFileSync(
      path.join(from, 'flow.excalidraw'),
      JSON.stringify({ elements: [{ link: '/prototypes/sam/old/view' }] }),
    );
    fs.writeFileSync(
      path.join(from, 'notes.md'),
      '[/sam/old/view](/sam/old/view) https://other.test/sam/old/view /sam/older/view',
    );
    moveWithLinks(from, to, { title: 'New' }, personAddress('sam', 'old'), '/prototypes/sam/new');
    assert.equal(fs.existsSync(from), false);
    assert.match(fs.readFileSync(path.join(to, 'flow.excalidraw'), 'utf8'), /\/prototypes\/sam\/new\/view/);
    assert.equal(
      fs.readFileSync(path.join(to, 'notes.md'), 'utf8'),
      '[/prototypes/sam/new/view](/prototypes/sam/new/view) https://other.test/sam/old/view /sam/older/view',
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('archives are validated before extraction and reject traversal, links, truncation and oversized entries', () => {
  assert.equal(archiveEntries(tar('pack/module.ts'))[0].data.toString(), 'hello');
  for (const name of ['../escape', '/escape', 'pack/../../escape'])
    assert.throws(() => archiveEntries(tar(name)), /path/);
  for (const type of ['1', '2', 'S']) assert.throws(() => archiveEntries(tar('link', type)), /regular files/);
  assert.throws(() => archiveEntries(tar('large', '0', Buffer.alloc(2 * 1024 * 1024 + 1))), /larger/);
  assert.throws(() => archiveEntries(gzipSync(Buffer.alloc(100))), /truncated/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-archive-'));
  try {
    assert.throws(() => extractArchive(tar('../escape'), dir));
    assert.deepEqual(fs.readdirSync(dir), []);
    extractArchive(tar('pack/module.ts'), dir);
    assert.equal(fs.readFileSync(path.join(dir, 'pack/module.ts'), 'utf8'), 'hello');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('download enforces its limit while streaming', async () => {
  assert.equal((await boundedDownload(new Response('hello'), 5)).toString(), 'hello');
  await assert.rejects(boundedDownload(new Response('hello!'), 5), /larger/);
});

test('prototype import allowlist includes its system and rejects unrelated local code', async () => {
  const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-import-policy-')));
  try {
    const root = path.join(fixture, 'src/prototypes/patrick/import-fixture');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'meta.json'), JSON.stringify({ systemId: '1111111111111111' }));
    const guard = importGuard({
      root: fixture,
      systems: {
        product: { studioId: '1111111111111111', role: 'prototype', dir: path.join(fixture, 'src/systems/product') },
      },
      defaultSystem: 'product',
      modules: [],
      prototypeDirs: [],
    });
    guard.configResolved({ command: 'build' });
    for (const [target, allowed] of [
      ['src/systems/product/components/button/index.ts', true],
      ['src/lib/store.ts', true],
      ['src/prototypes/patrick/import-fixture/_components/text.ts', true],
      ['scripts/lib/random.js', false],
      ['src/platform/app/router.tsx', false],
      ['src/prototypes/patrick/feedback-inbox/main.tsx', false],
    ]) {
      const context = {
        resolve: async () => ({ id: path.join(fixture, target) }),
        error: message => {
          throw new Error(message);
        },
      };
      const request = guard.resolveId.call(context, './thing', path.join(root, 'main.tsx'), {});
      if (allowed) await request;
      else await assert.rejects(request, /Prototype scope/);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('create and rename preserve addresses, file errors recover, and system removal protects prototypes', async () => {
  const { execFileSync } = await import('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-journey-'));
  const root = path.resolve('.');
  try {
    fs.cpSync(root, dir, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git'].includes(path.basename(file)),
    });
    ensureTeamManagement(dir);
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
    linkSystemDependencies(root, dir);
    // This journey creates prototypes with both starter systems, regardless of the host's QA state.
    const { editStudioConfig } = await import('./studio-setup.js');
    for (const id of ['product', 'marketing']) {
      const declaration = path.join(dir, 'src/systems', id, 'system.ts');
      fs.writeFileSync(declaration, editStudioConfig(fs.readFileSync(declaration, 'utf8'), { status: 'active' }));
    }
    // CLI operations need a registered identity independent of the host's Git config.
    const ownerContributorId = JSON.parse(
      fs.readFileSync(path.join(dir, 'contributors/patrick.json'), 'utf8'),
    ).studioId;
    fs.rmSync(path.join(dir, 'contributors'), { recursive: true, force: true });
    writeProfiles(dir, {
      patrick: {
        studioId: ownerContributorId,
        name: 'Test Maintainer',
        email: 'maintainer@example.test',
        github: '',
        welcomeDismissed: false,
      },
    });
    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      import assert from 'node:assert/strict';
      import { pathToFileURL } from 'node:url';
      const load = (file) => import(pathToFileURL(path.resolve(file)).href);
      const { createPrototype, renamePrototype } = await load('src/modules/' + 'prototypes/node/create.js');
      const { slug } = createPrototype({ title: 'Beta Journey', key: 'patrick' });
      const original = path.resolve('src/prototypes/patrick', slug);
      const { DEFAULT_SYSTEM, PROTOTYPE_SYSTEMS } = await load('src/modules/systems/node/systems.js');
      const defaultIdentity = PROTOTYPE_SYSTEMS[DEFAULT_SYSTEM].studioId;
      const { createResourceId } = await load('src/platform/core/resourceIdentity.ts');
      const { readDeclaration } = await load('src/platform/core/declarations.ts');
      const originalMeta = JSON.parse(fs.readFileSync(path.join(original, 'meta.json')));
      assert.equal(JSON.parse(fs.readFileSync(path.join(original, 'meta.json'))).systemId, defaultIdentity);
      const custom = createPrototype({ title: 'Custom Styling', key: 'patrick', system: null });
      assert.equal(custom.manifest.prototypes.find(p => p.id === custom.slug).system, null);
      assert.equal(JSON.parse(fs.readFileSync('src/prototypes/patrick/' + custom.slug + '/meta.json')).systemId, null);
      assert.throws(() => createPrototype({title:'Invalid System',key:'patrick',system:'missing'}), /installed prototype system/);
      assert.ok(!fs.existsSync('src/prototypes/patrick/invalid-system'));
      const { scopePolicy } = await load('scripts/lib/scope.js');

      const policy = scopePolicy({ root: path.resolve('.'), systems: PROTOTYPE_SYSTEMS, defaultSystem: DEFAULT_SYSTEM, modules: [] });
      const customView = path.resolve('src/prototypes/patrick', custom.slug, 'prototype.tsx');
      assert.equal(policy.scopeOf(customView).system, null);
      assert.match(policy.problem('@/systems/' + DEFAULT_SYSTEM + '/components/button', customView, path.resolve(PROTOTYPE_SYSTEMS[DEFAULT_SYSTEM].dir, 'components/button/button.tsx')), /outside its runtime boundary/);
      const selectedSystem = Object.keys(PROTOTYPE_SYSTEMS).find(id => id !== DEFAULT_SYSTEM) ?? DEFAULT_SYSTEM;
      const selected = createPrototype({title:'Selected System',key:'patrick',system:selectedSystem});
      assert.equal(selected.manifest.prototypes.find(p => p.id === selected.slug).system, selectedSystem);
      const cliCreate = (await import('node:child_process')).spawnSync(process.execPath, ['src/modules/prototypes/node/create.js', 'CLI Custom', '--no-system'], {encoding:'utf8'});
      assert.equal(cliCreate.status, 0, cliCreate.stderr);
      assert.equal(JSON.parse(fs.readFileSync('src/prototypes/patrick/cli-custom/meta.json')).systemId, null);
      const viewIdentity = fs.readFileSync(path.join(original, 'prototype.tsx'), 'utf8').match(/@studio-id ([0-9a-z]+)/)[1];
      const originalUrl = '/prototypes/' + originalMeta.studioId + '/artifacts/' + viewIdentity;
      fs.writeFileSync(path.join(original, 'notes.md'), '---\\nstudioId: ' + createResourceId() + '\\n---\\n[View](' + originalUrl + ') [Source](./prototype.tsx)');
      fs.writeFileSync(path.join(original, 'flow.excalidraw'), JSON.stringify({ studioId: createResourceId(), type: 'excalidraw', version: 2, elements: [], appState: {}, files: {} }));
      const { duplicatePrototype } = await load('src/modules/prototypes/node/duplicate.js');
      const before = fs.readFileSync(path.join(original, 'meta.json'), 'utf8');
      const copy = duplicatePrototype({key:'patrick',id:slug,title:'Beta Copy',system:DEFAULT_SYSTEM});
      const copiedMeta = JSON.parse(fs.readFileSync('src/prototypes/patrick/' + copy.id + '/meta.json'));
      assert.equal(copiedMeta.systemId, defaultIdentity);
      assert.equal(copiedMeta.rebuild, undefined);
      const copiedViewIdentity = fs.readFileSync('src/prototypes/patrick/' + copy.id + '/prototype.tsx', 'utf8').match(/@studio-id ([0-9a-z]+)/)[1];
      const copiedNotes = fs.readFileSync('src/prototypes/patrick/' + copy.id + '/notes.md', 'utf8');
      assert.ok(copiedNotes.includes('/prototypes/' + copiedMeta.studioId + '/artifacts/' + copiedViewIdentity));
      assert.ok(copiedNotes.includes('./prototype.tsx'));
      assert.ok(!copiedNotes.includes(originalUrl));
      assert.equal(fs.readFileSync(path.join(original, 'meta.json'), 'utf8'), before);
      const rebuild = duplicatePrototype({key:'patrick',id:slug,title:'Beta Rebuild',system:null});
      const rebuildMeta = JSON.parse(fs.readFileSync('src/prototypes/patrick/' + rebuild.id + '/meta.json'));
      assert.equal(rebuildMeta.systemId, defaultIdentity);
      assert.deepEqual(rebuildMeta.rebuild, {targetSystemId:null,sourcePrototypeId:originalMeta.studioId});
      const projectedRebuild = rebuild.manifest.prototypes.find(p => p.id === rebuild.id).rebuild;
      assert.equal(projectedRebuild.sourcePrototypeId, originalMeta.studioId);
      assert.equal(projectedRebuild.sourcePath, 'src/prototypes/patrick/' + slug);
      assert.equal(projectedRebuild.targetSystemId, null);
      const fromCustom = duplicatePrototype({key:'patrick',id:custom.slug,title:'Custom Rebuild',system:DEFAULT_SYSTEM});
      assert.equal(fromCustom.manifest.prototypes.find(p => p.id === fromCustom.id).system, null);
      assert.equal(fromCustom.manifest.prototypes.find(p => p.id === fromCustom.id).rebuild.targetSystemKey, DEFAULT_SYSTEM);
      assert.throws(() => duplicatePrototype({key:'patrick',id:slug,title:'Invalid Copy',system:'missing'}), /installed prototype system/);
      assert.ok(!fs.existsSync('src/prototypes/patrick/invalid-copy'));
      assert.throws(() => duplicatePrototype({key:'patrick',id:slug,title:'Beta Copy'}), /already exists/);
      fs.symlinkSync('/tmp', path.join(original,'outside'));
      assert.throws(() => duplicatePrototype({key:'patrick',id:slug,title:'Linked Copy'}), /symbolic links/);
      assert.ok(!fs.existsSync('src/prototypes/patrick/linked-copy'));
      fs.unlinkSync(path.join(original,'outside'));
      const renamed = renamePrototype({ key: 'patrick', id: slug, title: 'Beta Roundtrip' });
      assert.equal(renamed.id, 'beta-roundtrip');
      const moved = path.resolve('src/prototypes/patrick', renamed.id);
      assert.ok(fs.readFileSync(path.join(moved, 'notes.md'), 'utf8').includes(originalUrl));
      assert.ok(fs.readFileSync(path.join(moved, 'notes.md'), 'utf8').includes('./prototype.tsx'));
      assert.throws(() => renamePrototype({key:'patrick',id:renamed.id,title:'Feedback Inbox'}), /already/);
      const { buildManifest } = await load('scripts/build/build-manifest.js');
      assert.equal(buildManifest().errors, 0);
      const plugin = (await load('scripts/build/vite-files-plugin.js')).default();
      let handler;
      await plugin.configureServer({ middlewares: { use: (_path, fn) => { handler = fn; } }, watcher: { on() {} }, ws: { send() {} }, config: { logger: { error() {} } } });
      const originalRead = fs.readFileSync;
      const readable = path.join(moved, 'prototype.tsx');
      const request = { method: 'GET', url: '/file?contributor=patrick&prototype=beta-roundtrip&path=prototype.tsx', headers: {'sec-fetch-site':'same-origin'} };
      const response = () => ({ statusCode: 0, headersSent: false, setHeader() {}, end(body) { this.body = body; } });
      const failed = response();
      fs.readFileSync = (file, ...args) => { if (file === readable) throw new Error('Simulated read failure'); return originalRead(file, ...args); };
      try { await handler(request, failed, () => assert.fail('Unexpected fallback')); } finally { fs.readFileSync = originalRead; }
      assert.equal(failed.statusCode, 500);
      const recovered = response(); await handler(request, recovered, () => assert.fail('Unexpected fallback'));
      assert.equal(recovered.statusCode, 200);
      const { Readable } = await import('node:stream');
      const deniedRequest = Readable.from([JSON.stringify({contributor:'system-content',prototype:'studio:context',title:'Unauthorized Copy',system:null})]);
      deniedRequest.method = 'POST'; deniedRequest.url = '/prototype-duplicate';
      deniedRequest.headers = {'sec-fetch-site':'same-origin'};
      const denied = response(); await handler(deniedRequest, denied, () => assert.fail('Unexpected fallback'));
      assert.equal(denied.statusCode, 403);
      assert.ok(!fs.existsSync('src/prototypes/patrick/unauthorized-copy'));
      // Shared Markdown remains editable even when prototype Documents is absent.
      const { runOp } = await load('scripts/build/files/ops.js');
      runOp(path.resolve('src/systems/studio/context'), {op:'create', name:'beta-context.md'}, 'context');
      assert.match(fs.readFileSync('src/systems/studio/context/beta-context.md', 'utf8'), /title: Beta Context/);
      const systemContentResponse = response();
      await handler({...request, url:'/file?contributor=system-content&prototype=studio%3Acontext&path=beta-context.md'}, systemContentResponse, () => assert.fail('Unexpected fallback'));
      assert.equal(systemContentResponse.statusCode, 200);
      // Exercise both shared-source handlers with current grants, including revocation.
      const configBeforePermissions = fs.readFileSync('studio.config.ts', 'utf8');
      const permissionConfig = (await load('src/platform/core/declarations.ts')).readDeclaration(configBeforePermissions).value;
      fs.writeFileSync('contributors/permission-admin.json', JSON.stringify({ studioId: createResourceId(), name: 'Permission Admin', email: '', github: '', welcomeDismissed: false }));
      permissionConfig.usage = 'team'; permissionConfig.admins = [JSON.parse(fs.readFileSync('contributors/permission-admin.json')).studioId];
      const ownerContributorIdentity = JSON.parse(fs.readFileSync('contributors/patrick.json')).studioId;
      permissionConfig.systemMaintainers[defaultIdentity] = [ownerContributorIdentity];
      const writePermissionConfig = () => fs.writeFileSync('studio.config.ts', 'export default ' + JSON.stringify(permissionConfig) + ';');
      const sourceRequest = async (url, body) => {
        const req = Readable.from([JSON.stringify(body)]); req.method = 'POST'; req.url = url; req.headers = {'sec-fetch-site':'same-origin'};
        const res = response(); await handler(req, res, () => assert.fail('Unexpected fallback')); return res;
      };
      writePermissionConfig();
      const documentationDenied = await sourceRequest('/documentation', {action:'write', path:'src/platform/README.md', content:'# Unauthorized'});
      assert.equal(documentationDenied.statusCode, 403);
      const themePath = 'src/systems/product/styles/theme.css';
      const themeRead = await sourceRequest('/system-source', {action:'read', path:themePath});
      assert.equal(themeRead.statusCode, 200);
      const theme = JSON.parse(themeRead.body);
      const themeSaved = await sourceRequest('/system-source', {action:'write', path:themePath, base:theme.version, content:theme.content});
      assert.equal(themeSaved.statusCode, 200, themeSaved.body);
      permissionConfig.systemMaintainers[defaultIdentity] = []; writePermissionConfig();
      const themeDenied = await sourceRequest('/system-source', {action:'write', path:themePath, base:theme.version, content:theme.content});
      assert.equal(themeDenied.statusCode, 403);
      fs.writeFileSync('studio.config.ts', configBeforePermissions); fs.unlinkSync('contributors/permission-admin.json');

      fs.mkdirSync('src/systems/z-beta-fixture');
      const newSystemIdentity = createResourceId();
      const productSource = fs.readFileSync('src/systems/product/system.ts', 'utf8');
      const { editStudioConfig } = await load('scripts/lib/studio-setup.js');
      fs.writeFileSync('src/systems/z-beta-fixture/system.ts', editStudioConfig(productSource, { studioId: newSystemIdentity }));
      const registeredConfig = readDeclaration(fs.readFileSync('studio.config.ts', 'utf8')).value;
      fs.writeFileSync('studio.config.ts', editStudioConfig(fs.readFileSync('studio.config.ts', 'utf8'), { systems: [...registeredConfig.systems, 'z-beta-fixture'], systemMaintainers: { ...registeredConfig.systemMaintainers, [newSystemIdentity]: [] } }));
      const metaPath = path.join(moved, 'meta.json');
      const meta = JSON.parse(fs.readFileSync(metaPath)); meta.systemId = newSystemIdentity;
      fs.writeFileSync(metaPath, JSON.stringify(meta));
      const { spawnSync } = await import('node:child_process');
      const removal = spawnSync(process.execPath, ['scripts/cli/studio.js', 'remove', 'z-beta-fixture'], { encoding: 'utf8' });
      assert.equal(removal.status, 1);
      assert.equal((removal.stderr + removal.stdout).includes('patrick/beta-roundtrip'), true, removal.stderr + removal.stdout);
      assert.equal(fs.existsSync('src/systems/z-beta-fixture/system.ts'), true);
      meta.systemId = defaultIdentity; meta.rebuild = {targetSystemId:newSystemIdentity,sourcePrototypeId:originalMeta.studioId};
      fs.writeFileSync(metaPath, JSON.stringify(meta));
      const pendingRemoval = spawnSync(process.execPath, ['scripts/cli/studio.js','remove','z-beta-fixture'], {encoding:'utf8'});
      assert.equal(pendingRemoval.status, 1);
      assert.equal((pendingRemoval.stderr + pendingRemoval.stdout).includes('patrick/beta-roundtrip'), true);

    `;
    execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
      cwd: dir,
      timeout: 30000,
      encoding: 'utf8',
      stdio: 'pipe',
      env: {
        ...process.env,
        MISE_TRUSTED_CONFIG_PATHS: dir,
        GIT_CONFIG_COUNT: '2',
        GIT_CONFIG_KEY_0: 'user.name',
        GIT_CONFIG_VALUE_0: 'Test Maintainer',
        GIT_CONFIG_KEY_1: 'user.email',
        GIT_CONFIG_VALUE_1: 'maintainer@example.test',
      },
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CI accepts reviewed platform proposals and maintainer pushes, rejecting other platform pushes', async () => {
  const { execFileSync, spawnSync } = await import('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-ci-'));
  try {
    const root = path.resolve('.');
    fs.cpSync(root, dir, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git'].includes(path.basename(file)),
    });
    const runGit = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: 'pipe' }).trim();
    runGit('init', '-q');
    runGit('config', 'user.name', 'Test Maintainer');
    runGit('config', 'user.email', 'test@example.test');
    runGit('config', 'core.hooksPath', '/dev/null');
    runGit('add', 'contributors/', 'README.md');
    runGit('commit', '-qm', 'Initial fixture');
    const base = runGit('rev-parse', 'HEAD');
    fs.appendFileSync(path.join(dir, 'README.md'), '\nPlatform fixture\n');
    runGit('add', 'README.md');
    runGit('commit', '-qm', 'Platform fixture');
    const head = runGit('rev-parse', 'HEAD');
    const github = JSON.parse(fs.readFileSync(path.join(dir, 'contributors/patrick.json'))).github;
    for (const [role, review, expected] of [
      ['write', false, 1],
      ['maintain', false, 0],
      ['admin', false, 0],
      ['write', true, 0],
    ]) {
      const result = spawnSync(
        process.execPath,
        ['scripts/check/check-scope.js', '--ci', base, head, ...(review ? ['--review'] : [])],
        {
          cwd: dir,
          encoding: 'utf8',
          env: {
            ...process.env,
            STUDIO_SCOPE_ACTOR: github,
            STUDIO_PLATFORM_ROLE: role,
            MISE_TRUSTED_CONFIG_PATHS: dir,
          },
        },
      );
      assert.equal(result.status, expected, result.stderr + result.stdout);
    }
    const { readDeclaration } = await import('../../src/platform/core/modules/pack.ts');
    const configFile = path.join(dir, 'studio.config.ts');
    const config = readDeclaration(fs.readFileSync(configFile, 'utf8')).value;
    writeProfiles(dir, { sam: { name: 'Sam', github: 'sam-fixture' } });
    const patrickId = JSON.parse(fs.readFileSync(path.join(dir, 'contributors/patrick.json'))).studioId;
    const samId = JSON.parse(fs.readFileSync(path.join(dir, 'contributors/sam.json'))).studioId;
    const productId = readDeclaration(fs.readFileSync(path.join(dir, 'src/systems/product/system.ts'), 'utf8')).value
      .studioId;
    config.usage = 'team';
    config.admins = [patrickId];
    config.systemMaintainers[productId] = [samId];
    fs.writeFileSync(configFile, 'export default ' + JSON.stringify(config) + ';');
    const systemFile = path.join(dir, 'src/systems/product/system.ts');
    const { editStudioConfig } = await import('./studio-setup.js');
    fs.writeFileSync(systemFile, editStudioConfig(fs.readFileSync(systemFile, 'utf8'), { status: 'active' }));
    runGit(
      'add',
      'studio.config.ts',
      'contributors/sam.json',
      ...config.systems.map(key => `src/systems/${key}/system.ts`),
    );
    runGit('commit', '-qm', 'Trusted grants');
    const granted = runGit('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(dir, 'src/systems/product/scope-fixture.md'), '# Assigned system');
    runGit('add', 'src/systems/product/scope-fixture.md');
    runGit('commit', '-qm', 'Assigned system work');
    const check = (before, actor = 'sam-fixture', review = false) =>
      spawnSync(
        process.execPath,
        ['scripts/check/check-scope.js', '--ci', before, runGit('rev-parse', 'HEAD'), ...(review ? ['--review'] : [])],
        {
          cwd: dir,
          encoding: 'utf8',
          env: {
            ...process.env,
            STUDIO_SCOPE_ACTOR: actor,
            STUDIO_PLATFORM_ROLE: 'write',
            MISE_TRUSTED_CONFIG_PATHS: dir,
          },
        },
      );
    const maintainerCheck = check(granted);
    assert.equal(
      maintainerCheck.status,
      0,
      'Assigned maintainer can push system work\n' + maintainerCheck.stderr + maintainerCheck.stdout,
    );
    const beforeImpersonation = runGit('rev-parse', 'HEAD');
    const profileFile = path.join(dir, 'contributors/patrick.json');
    const profile = JSON.parse(fs.readFileSync(profileFile));
    fs.writeFileSync(profileFile, JSON.stringify({ ...profile, github: 'sam-fixture' }));
    runGit('add', 'contributors/patrick.json');
    runGit('commit', '-qm', 'Proposed identity change');
    assert.equal(check(beforeImpersonation).status, 1, 'Proposed profile cannot impersonate an Admin');
    assert.equal(
      check(beforeImpersonation, 'sam-fixture', true).status,
      0,
      'Out of scope proposals are allowed through review',
    );
    fs.writeFileSync(profileFile, JSON.stringify(profile));
    runGit('add', 'contributors/patrick.json');
    runGit('commit', '-qm', 'Restore profile');
    const beforeElevation = runGit('rev-parse', 'HEAD');
    config.admins.push(samId);
    fs.writeFileSync(configFile, 'export default ' + JSON.stringify(config) + ';');
    runGit('add', 'studio.config.ts');
    runGit('commit', '-qm', 'Proposed Admin assignment');
    assert.equal(check(beforeElevation).status, 1, 'Proposed grants do not authorize themselves');
    const beforeMode = runGit('rev-parse', 'HEAD');
    config.usage = 'personal';
    fs.writeFileSync(configFile, 'export default ' + JSON.stringify(config) + ';');
    runGit('add', 'studio.config.ts');
    runGit('commit', '-qm', 'Proposed personal mode');
    assert.equal(
      check(beforeMode, 'unregistered-fixture').status,
      1,
      'Proposed personal mode cannot bypass team scope',
    );
    const personalBase = runGit('rev-parse', 'HEAD');
    fs.appendFileSync(path.join(dir, 'README.md'), '\nPersonal work\n');
    runGit('add', 'README.md');
    runGit('commit', '-qm', 'Personal work');
    const personalResult = check(personalBase, 'unregistered-fixture');
    assert.equal(personalResult.status, 0, personalResult.stderr + personalResult.stdout);
    assert.match(personalResult.stdout, /team ownership checks are skipped/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('shared documentation catalog covers Manual and Reference and keeps damaged chapters repairable', async () => {
  const { documentationSources, sourceFile } = await import('../build/files/source.js');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-documentation-catalog-'));
  try {
    const chapter = 'src/modules/documentation/pages/index.md';
    const readme = 'src/modules/prototypes/README.md';
    for (const file of [chapter, readme]) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), '# Source');
    }
    const manifest = {
      manual: [{ slug: 'index', source: '/modules/documentation/pages/index.md' }],
      platformReferences: [
        { id: 'documentation', enabled: true, references: [] },
        { id: 'prototypes', enabled: true, references: [{ source: '/modules/prototypes/README.md' }] },
      ],
    };
    const allowed = documentationSources(root, manifest);
    assert.ok(allowed.includes(chapter));
    assert.equal(allowed.filter(file => file === readme).length, 1);
    for (const file of [chapter, readme]) {
      const before = sourceFile(root, allowed, { action: 'read', path: file });
      assert.equal(
        sourceFile(root, allowed, { action: 'write', path: file, content: '# Edited', base: before.body.version })
          .status,
        undefined,
      );
    }
    fs.writeFileSync(path.join(root, chapter), '---\ntitle: broken');
    assert.equal(
      sourceFile(root, documentationSources(root, manifest), { action: 'read', path: chapter }).body.content,
      '---\ntitle: broken',
    );
    manifest.platformReferences[0].enabled = false;
    manifest.manual = [];
    assert.ok(!documentationSources(root, manifest).includes(chapter));
    assert.equal(sourceFile(root, allowed, { action: 'read', path: '../../README.md' }).status, 404);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('shared source operations allow cataloged Markdown and system code with stale-write and symlink protection', async () => {
  const { sourceFile } = await import('../build/files/source.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-documentation-'));
  try {
    const relative = 'src/platform/core/contract.md';
    const file = path.join(dir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '# Contract');
    const call = (request, allowed = [relative]) => sourceFile(dir, allowed, request);
    const before = call({ action: 'read', path: relative });
    assert.equal(before.body.content, '# Contract');
    assert.equal(call({ action: 'read', path: '../../README.md' }).status, 404);
    assert.equal(call({ action: 'read', path: relative }, []).status, 404);
    assert.equal(call({ action: 'delete', path: relative }).status, 400);
    assert.equal(call({ action: 'reveal', path: relative }).reveal, file);
    fs.writeFileSync(file, '# External edit');
    assert.equal(
      call({ action: 'write', path: relative, content: '# Overwrite', base: before.body.version }).status,
      409,
    );
    assert.equal(fs.readFileSync(file, 'utf8'), '# External edit');
    const current = call({ action: 'read', path: relative });
    assert.equal(
      call({ action: 'write', path: relative, content: '# Accepted', base: current.body.version }).status,
      undefined,
    );
    assert.equal(fs.readFileSync(file, 'utf8'), '# Accepted');
    assert.equal(call({ action: 'write', path: relative, content: 'x'.repeat(750 * 1024 + 1) }).status, 413);
    const theme = 'src/systems/product/styles/theme.css';
    fs.mkdirSync(path.dirname(path.join(dir, theme)), { recursive: true });
    fs.writeFileSync(path.join(dir, theme), '.product-theme { --background: white; }');
    assert.equal(call({ action: 'read', path: theme }).status, 404);
    const themeSource = call({ action: 'read', path: theme }, [theme]);
    assert.equal(themeSource.body.content, '.product-theme { --background: white; }');
    assert.equal(
      call(
        {
          action: 'write',
          path: theme,
          content: '.product-theme { --background: black; }',
          base: themeSource.body.version,
        },
        [theme],
      ).status,
      undefined,
    );
    fs.unlinkSync(file);
    fs.symlinkSync(path.join(dir, 'other.md'), file);
    assert.equal(call({ action: 'read', path: relative }).status, 404);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('standalone diagrams are discovered by both extensions and disabling preserves Markdown', {
  skip: !fs.existsSync('src/modules/diagrams/type.ts'),
}, async () => {
  const { execFileSync } = await import('node:child_process');
  const root = path.resolve('.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-diagrams-'));
  try {
    fs.cpSync(root, dir, {
      recursive: true,
      filter: file => !['.git', 'node_modules', 'dist'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
    linkSystemDependencies(root, dir);
    // Availability is a metadata contract, independent of the Manual's editorial structure.
    const pages = path.join(dir, 'src/modules/documentation/pages');
    if (fs.existsSync(pages))
      fs.writeFileSync(
        path.join(pages, 'diagrams.md'),
        '---\ntitle: Diagrams fixture\norder: 99\nmodule: diagrams\n---\nFixture chapter.\n',
      );
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
      import fs from 'node:fs'; import assert from 'node:assert/strict';
      import { editModulesFlag } from './src/platform/core/modules/pack.ts';
      const config='studio.config.ts';
      fs.writeFileSync(config, editModulesFlag(fs.readFileSync(config,'utf8'), 'diagrams', true));
      const folder='src/prototypes/patrick/feedback-inbox';
      fs.writeFileSync(folder+'/test-flow.mermaid','flowchart LR\\n  a --> b');
      fs.writeFileSync(folder+'/test-sequence.mmd','sequenceDiagram\\n  Alice->>Bob: Hello');
      fs.writeFileSync(folder+'/_helper.mermaid','flowchart LR\\n  a --> b');
      fs.writeFileSync(folder+'/test-invalid.mermaid','this is intentionally invalid');
      fs.mkdirSync(folder+'/test-folder');
      fs.writeFileSync(folder+'/test-folder/entry.mermaid','flowchart LR\\n  a --> b');
      const meta=JSON.parse(fs.readFileSync(folder+'/meta.json','utf8'));
      meta.order=['_helper.mermaid','test-folder','about-this-prototype.md'];
      fs.writeFileSync(folder+'/meta.json',JSON.stringify(meta));
      const { planPrototypeIdentification, applyPrototypeIdentification } = await import('./scripts/lib/prototype-identification.js');
      const { INSTALLED_FILE_TYPES } = await import('./scripts/lib/installed-file-types.js');
      const identityPlan = planPrototypeIdentification(process.cwd(), INSTALLED_FILE_TYPES, folder, 'patrick');
      applyPrototypeIdentification(process.cwd(), INSTALLED_FILE_TYPES, identityPlan, 'patrick');
      const { buildManifest } = await import('./scripts/build/build-manifest.js');
      const { manifest, errors } = buildManifest({write:false,quiet:true});
      assert.equal(errors,0);
      const prototype=manifest.prototypes.find(p=>p.contributorKey==='patrick'&&p.id==='feedback-inbox');
      for(const name of ['test-flow.mermaid','test-sequence.mmd','test-invalid.mermaid']) assert.equal(prototype.artifacts.find(i=>i.path===name)?.fileType,'diagrams');
      assert.equal(prototype.artifacts.some(i=>i.path==='_helper.mermaid'),false);
      assert.equal(prototype.artifacts[0].path,'test-folder/entry.mermaid');
      assert.equal('start' in prototype,false);
      assert.equal('description' in prototype,false);
      if (fs.existsSync('src/modules/document/type.ts')) assert.ok(prototype.artifacts.some(i=>i.fileType==='document'));
      else assert.equal(prototype.artifacts.some(i=>i.fileType==='document'), false);
      assert.ok(manifest.platformReferences.find(g=>g.id==='diagrams')?.references.length);
      if (manifest.manual.length) {
        assert.ok(manifest.manual.some(p=>p.slug==='diagrams' && p.source==='/modules/documentation/pages/diagrams.md'));
        assert.ok(manifest.manual.every(p=>p.source?.startsWith('/modules/documentation/pages/')));
      }
      fs.writeFileSync(config,editModulesFlag(fs.readFileSync(config,'utf8'),'diagrams',false));
    `,
      ],
      { cwd: dir, encoding: 'utf8', stdio: 'pipe' },
    );
    // A fresh process observes the changed module configuration.
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
      import fs from 'node:fs'; import assert from 'node:assert/strict';
      import {buildManifest} from './scripts/build/build-manifest.js';
      const {manifest,errors}=buildManifest({write:false,quiet:true}); assert.equal(errors,0);
      const prototype=manifest.prototypes.find(p=>p.contributorKey==='patrick'&&p.id==='feedback-inbox');
      assert.equal(prototype.artifacts.some(i=>i.fileType==='diagrams'),false);
      if (fs.existsSync('src/modules/document/type.ts')) assert.equal(prototype.artifacts[0].path,'about-this-prototype.md');
      assert.ok(fs.existsSync('src/prototypes/patrick/feedback-inbox/about-this-prototype.md'));
      if (fs.existsSync('src/modules/document/type.ts')) assert.ok(prototype.artifacts.some(i=>i.fileType==='document'));
      else assert.equal(prototype.artifacts.some(i=>i.fileType==='document'), false);
      assert.ok(fs.existsSync('src/prototypes/patrick/feedback-inbox/test-flow.mermaid'));
      assert.equal(manifest.platformReferences.find(g=>g.id==='diagrams')?.references.length,0);
      assert.equal(manifest.manual.some(p=>p.slug==='diagrams'),false);
    `,
      ],
      { cwd: dir, encoding: 'utf8', stdio: 'pipe' },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
