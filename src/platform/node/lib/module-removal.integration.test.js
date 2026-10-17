import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { MODULES } from './modules.js';
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
    for (const module of Object.values(MODULES).filter(module => module.optional))
      studio(mode === 'disabled' ? 'disable' : 'remove', module.id, ...(mode === 'removed' ? ['--yes'] : []));
    run('pnpm', ['build']);
  });
