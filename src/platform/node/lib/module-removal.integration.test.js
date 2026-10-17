import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { MODULES, ENABLED_MODULES } from './modules.js';
import { entryPaths } from '../build/vite-module-entries-plugin.js';
import { moduleDirOf } from './module-folders.js';
import { writeProfiles } from './fixtures/contributors.js';
import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';

// The ordinary build covers enabled modules; these fixtures cover the two unavailable states.
for (const mode of ['disabled', 'removed'])
  test(`production works with all optional modules ${mode}`, t => {
    const root = process.cwd();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `studio-${mode}-`));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.cpSync(root, dir, {
      recursive: true,
      filter: file => !['.git', 'node_modules', 'dist'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
    linkSystemDependencies(root, dir);
    writeProfiles(dir, { availability: { name: 'Availability Fixture', email: 'availability@example.test' } });
    const env = {
      ...process.env,
      MISE_TRUSTED_CONFIG_PATHS: dir,
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'user.name',
      GIT_CONFIG_VALUE_0: 'Availability Fixture',
      GIT_CONFIG_KEY_1: 'user.email',
      GIT_CONFIG_VALUE_1: 'availability@example.test',
    };
    const run = (command, args) =>
      execFileSync(command, args, { cwd: dir, env, stdio: 'pipe', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    const studio = (...args) => run(process.execPath, ['src/platform/node/cli/studio.js', ...args]);
    studio('configure', '--usage', 'personal', '--recovery', '--yes');
    const configFile = path.join(dir, 'studio.config.json');
    const original = fs.readFileSync(configFile, 'utf8');
    const optional = Object.values(MODULES).filter(module => module.optional);
    // Probe each absence with the other modules still enabled. No additional production builds.
    for (const module of optional) {
      const config = JSON.parse(original);
      if (mode === 'disabled') config.modules[module.id] = false;
      else delete config.modules[module.id];
      const source = path.join(dir, moduleDirOf(dir, module.id));
      const held = path.join(dir, '.availability-held');
      const remaining = ENABLED_MODULES.filter(item => item.id !== module.id);
      const expected = {
        id: module.id,
        active: remaining.map(item => item.id),
        entries: Object.fromEntries(
          ['app.tsx', 'open.tsx', 'type.ts'].map(entry => [entry, entryPaths(remaining, entry, dir)]),
        ),
        hooks: Object.fromEntries(
          ['server.ts', 'build.ts'].map(entry => [
            entry,
            remaining
              .filter(item => fs.existsSync(path.join(dir, moduleDirOf(dir, item.id), entry)))
              .map(item => item.id),
          ]),
        ),
      };
      fs.writeFileSync(configFile, JSON.stringify(config));
      if (mode === 'removed') fs.renameSync(source, held);
      try {
        const output = run(process.execPath, [
          '--input-type=module',
          '--eval',
          `
          import assert from 'node:assert/strict';
          import {ENABLED_MODULES, SERVER_FILES} from './src/platform/node/lib/modules.js';
          import {FILE_TYPES} from './src/platform/node/lib/file-types.js';
          import {moduleBuilds} from './src/platform/node/lib/module-builds.js';
          import {entryPaths} from './src/platform/node/build/vite-module-entries-plugin.js';
          import {buildManifest} from './src/platform/node/build/build-manifest.js';
          const expected = JSON.parse(process.argv[1]);
          assert.deepEqual(ENABLED_MODULES.map(module => module.id), expected.active);
          for (const entry of Object.keys(expected.entries))
            assert.deepEqual(entryPaths(ENABLED_MODULES, entry), expected.entries[entry]);
          assert.deepEqual(SERVER_FILES.map(([id]) => id), expected.hooks['server.ts']);
          assert.deepEqual(moduleBuilds().map(([id]) => id), expected.hooks['build.ts']);
          assert.deepEqual(Object.keys(FILE_TYPES), expected.entries['type.ts'].map(file => file.split('/').at(-2)).sort());
          const {manifest, errors} = buildManifest({write: false, quiet: true});
          assert.equal(errors, 0);
          assert.equal(Object.hasOwn(manifest.contributions, expected.id), false);
          console.log('availability probe passed');
        `,
          JSON.stringify(expected),
        ]);
        assert.match(output.toString(), /availability probe passed/);
        t.diagnostic(`${module.id} ${mode}: remaining entries, file types, hooks and manifest pass`);
      } finally {
        if (mode === 'removed') fs.renameSync(held, source);
        fs.writeFileSync(configFile, original);
      }
    }
    for (const module of optional)
      studio(mode === 'disabled' ? 'disable' : 'remove', module.id, ...(mode === 'removed' ? ['--yes'] : []));
    run('pnpm', ['build']);
  });
