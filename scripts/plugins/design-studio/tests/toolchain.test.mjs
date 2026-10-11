import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import {
  findWorkingGit,
  gitEnvironment,
  configureLocalGit,
  verifyPinnedTools,
} from '../../../../plugins/design-studio/scripts/toolchain.mjs';
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-tools-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ['bad', 'good', '.git/info']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, 'bad/git'), '#!/bin/sh\necho Xcode-license-required >&2\nexit 69\n', {
    mode: 0o755,
  });
  fs.writeFileSync(path.join(root, 'good/git'), '#!/bin/sh\necho "git version 2.54.0"\n', { mode: 0o755 });
  // This bad Node must never displace mise's pinned Node, even next to working Git.
  fs.writeFileSync(path.join(root, 'good/node'), '#!/bin/sh\necho wrong-node >&2\nexit 99\n', { mode: 0o755 });
  return root;
}
test('skips executable but broken Git and reports actual tool failure', t => {
  const root = fixture(t);
  const env = { ...process.env, PATH: path.join(root, 'bad') + path.delimiter + path.join(root, 'good') };
  assert.equal(findWorkingGit({ env, platform: 'linux' }), path.join(root, 'good/git'));
  assert.throws(
    () => findWorkingGit({ env: { ...env, PATH: path.join(root, 'bad') }, platform: 'linux' }),
    /No working Git.*Xcode-license-required/,
  );
});
test('local Git survives ordinary mise exec without replacing pinned Node or tracked settings', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'mise.toml'), '[tools]\nnode = "24"\npnpm = "12"\n');
  const git = path.join(root, 'good/git');
  assert.equal(configureLocalGit(root, git), true);
  assert.equal(configureLocalGit(root, git), true);
  assert.equal(
    findWorkingGit({ env: { ...process.env, PATH: path.join(root, '.git/design-studio-tools') }, platform: 'linux' }),
    git,
  );
  // Keep fixture trust and config independent of the CI runner's mise settings.
  const fixtureEnv = {
    ...process.env,
    MISE_TRUSTED_CONFIG_PATHS: root,
    MISE_STATE_DIR: path.join(root, 'mise-state'),
    MISE_CONFIG_DIR: path.join(root, 'mise-config'),
  };
  for (const key of Object.keys(fixtureEnv)) if (key.startsWith('__MISE_')) delete fixtureEnv[key];
  const env = gitEnvironment(git, fixtureEnv);
  for (const config of ['mise.toml', 'mise.local.toml']) {
    const trust = spawnSync('mise', ['trust', path.join(root, config)], { env, encoding: 'utf8' });
    assert.equal(trust.status, 0, trust.stderr);
  }
  // Model a fresh shell: mise preserves custom PATH entries ahead of an already
  // active toolchain, so remove inherited tool bins before adding broken Git.
  const bins = spawnSync('mise', ['bin-paths'], { cwd: root, env: fixtureEnv, encoding: 'utf8' });
  assert.equal(bins.status, 0, bins.stderr);
  const canonical = dir => (fs.existsSync(dir) ? fs.realpathSync(dir) : dir);
  const toolBins = new Set(bins.stdout.trim().split('\n').map(canonical));
  const shimDir =
    process.env.MISE_SHIMS_DIR ??
    path.join(process.env.MISE_DATA_DIR ?? path.join(os.homedir(), '.local/share/mise'), 'shims');
  toolBins.add(canonical(shimDir));
  const inheritedPath = process.env.PATH.split(path.delimiter)
    .filter(dir => !toolBins.has(canonical(dir)))
    .join(path.delimiter);
  const tools = verifyPinnedTools(root, {
    ...fixtureEnv,
    PATH: path.join(root, 'bad') + path.delimiter + inheritedPath,
  });
  assert.match(tools.nodeVersion, /^24\./);
  assert.equal(tools.gitVersion, 'git version 2.54.0');
  assert.equal(fs.readFileSync(path.join(root, 'mise.toml'), 'utf8'), '[tools]\nnode = "24"\npnpm = "12"\n');
  assert.equal(fs.readFileSync(path.join(root, '.git/info/exclude'), 'utf8'), '\n/mise.local.toml\n');
});
test('preserves custom local mise configuration', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'mise.local.toml'), '# personal settings\n');
  assert.equal(configureLocalGit(root, path.join(root, 'good/git')), false);
  assert.equal(fs.readFileSync(path.join(root, 'mise.local.toml'), 'utf8'), '# personal settings\n');
  assert.equal(fs.existsSync(path.join(root, '.git/design-studio-tools')), false);
});
