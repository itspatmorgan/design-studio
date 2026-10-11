import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { readPersistedStudioConfig } from './persisted-studio-config.js';
import { readDeclaration } from '../../core/declarations.ts';

// The public migration must start successfully in a pre-cutover studio where
// strict runtime imports cannot yet resolve IDs. Then normal readers must work.
test('public CLI migrates an old studio from a saved preview and strict runtime resolves the result', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-identity-cli-'));
  try {
    fs.cpSync(original, root, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'));
    linkSystemDependencies(original, root);
    const runtime = readPersistedStudioConfig(root).config;
    runtime.usage = 'personal';
    fs.writeFileSync(path.join(root, 'studio.config.ts'), 'export default ' + JSON.stringify(runtime) + ';');
    for (const file of fs.globSync(['src/platform/systems/*/system.ts', 'src/systems/*/system.ts'], { cwd: root })) {
      const spec = readDeclaration(fs.readFileSync(path.join(root, file), 'utf8')).value;
      delete spec.studioId;
      fs.writeFileSync(path.join(root, file), 'export default ' + JSON.stringify(spec) + ';');
    }
    const personFile = path.join(root, 'contributors/patrick.json');
    const person = JSON.parse(fs.readFileSync(personFile));
    delete person.studioId;
    fs.writeFileSync(personFile, JSON.stringify(person));
    fs.rmSync(path.join(root, 'src/prototypes'), { recursive: true, force: true });
    const folder = 'src/prototypes/patrick/example',
      dir = path.join(root, folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'meta.json'), '{"title":"Example","systemId":null}');
    fs.writeFileSync(path.join(dir, 'main.tsx'), 'export default function View(){ return <div>Example</div> }');
    fs.writeFileSync(
      path.join(dir, 'notes.md'),
      '# Notes\n[View](/prototypes/patrick/example/main) [File](./main.tsx)',
    );
    fs.writeFileSync(
      path.join(dir, 'board.excalidraw'),
      JSON.stringify({ type: 'excalidraw', version: 2, studioVersion: 1, elements: [], appState: {}, files: {} }),
    );
    const options = {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        MISE_TRUSTED_CONFIG_PATHS: root,
        GIT_CONFIG_COUNT: '2',
        GIT_CONFIG_KEY_0: 'user.name',
        GIT_CONFIG_VALUE_0: person.name,
        GIT_CONFIG_KEY_1: 'user.email',
        GIT_CONFIG_VALUE_1: person.email,
      },
    };
    const run = (...args) =>
      execFileSync(process.execPath, ['src/platform/node/cli/studio.js', ...args], { ...options, stdio: 'pipe' });
    const preview = path.join(root, 'reviewed-identities.json');
    run('identity-plan', '--out', preview);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'))).studioId, undefined);
    const saved = JSON.parse(fs.readFileSync(preview));
    fs.writeFileSync(path.join(dir, 'new.md'), '# Concurrent file');
    const stale = spawnSync(
      process.execPath,
      ['src/platform/node/cli/studio.js', 'identity-apply', preview, '--yes'],
      options,
    );
    assert.equal(stale.status, 1);
    assert.ok(!fs.existsSync(path.join(root, '.studio-system-operation')));
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'))).studioId, undefined);
    fs.unlinkSync(path.join(dir, 'new.md'));
    run('identity-apply', preview, '--yes');
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json')));
    assert.equal(meta.systemId, null);
    assert.equal(meta.ownerContributorId, JSON.parse(fs.readFileSync(personFile)).studioId);
    const notes = fs.readFileSync(path.join(dir, 'notes.md'), 'utf8');
    assert.ok(notes.includes(`/prototypes/${meta.studioId}/artifacts/`));
    assert.ok(notes.includes('./main.tsx'));
    assert.equal(JSON.parse(run('identity-audit', '--json')).missing.length, 0);
    const context = JSON.parse(run('context', folder, '--json'));
    assert.equal(context.prototype.studioId, meta.studioId);
    assert.equal(context.assignment.system, null);
    const next = JSON.parse(run('identity-plan', '--json'));
    assert.equal(next.changes.length, 0);
    assert.equal(next.resources.length, saved.resources.length);
    // Canvas tools accept source filenames, store permanent links, and retain scene identity.
    execFileSync(process.execPath, ['src/platform/node/build/build-manifest.js', '--strict'], {
      ...options,
      stdio: 'pipe',
    });
    const canvas = (...args) =>
      execFileSync(process.execPath, ['src/modules/canvas/cli.ts', folder + '/board.excalidraw', ...args], {
        ...options,
        stdio: 'pipe',
      });
    const boardFile = path.join(dir, 'board.excalidraw'),
      boardBefore = fs.readFileSync(boardFile, 'utf8');
    const available = JSON.parse(canvas('artifacts'));
    assert.ok(JSON.stringify(available).includes('main.tsx'));
    assert.equal(fs.readFileSync(boardFile, 'utf8'), boardBefore);
    canvas('create', JSON.stringify({ type: 'artifact', artifact: './main.tsx' }));
    const board = JSON.parse(fs.readFileSync(boardFile));
    assert.equal(board.studioId, JSON.parse(boardBefore).studioId);
    assert.match(
      board.elements.find(element => element.type === 'embeddable').link,
      new RegExp('^/prototypes/' + meta.studioId + '/artifacts/[0-9a-hjkmnp-tv-z]{16}$'),
    );
    const canvasAfter = fs.readFileSync(boardFile, 'utf8');
    const denied = spawnSync(
      process.execPath,
      ['src/modules/canvas/cli.ts', folder + '/board.excalidraw', 'create', '{"type":"note","text":"Unauthorized"}'],
      {
        ...options,
        env: { ...options.env, GIT_CONFIG_VALUE_0: 'Unknown Person', GIT_CONFIG_VALUE_1: 'unknown@example.invalid' },
      },
    );
    assert.equal(denied.status, 1);
    assert.equal(fs.readFileSync(boardFile, 'utf8'), canvasAfter);
    // Location changes while the server is closed retain permanent metadata.
    fs.renameSync(dir, path.join(root, 'src/prototypes/patrick/renamed'));
    const relocated = JSON.parse(run('context', 'src/prototypes/patrick/renamed', '--json'));
    assert.equal(relocated.prototype.studioId, meta.studioId);
    assert.ok(
      fs
        .readFileSync(path.join(root, 'src/prototypes/patrick/renamed/notes.md'), 'utf8')
        .includes(`/prototypes/${meta.studioId}/artifacts/`),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
