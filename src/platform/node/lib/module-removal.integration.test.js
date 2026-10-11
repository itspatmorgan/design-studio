import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test('optional modules support enabled, disabled, and removed production configurations', async t => {
  const root = path.resolve(import.meta.dirname, '../../../..');
  const logs = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-availability-logs-'));
  t.after(() => fs.rmSync(logs, { recursive: true, force: true }));
  const optional = ['canvas', 'diagrams', 'document', 'documentation', 'onboarding', 'contributors'].filter(id =>
    fs.existsSync(path.join(root, 'src/platform/modules', id, 'module.ts')),
  );
  const cases = [
    ['none', 'enabled'],
    ...optional.flatMap(id => [
      [id, 'disabled'],
      [id, 'removed'],
    ]),
  ];
  let next = 0;
  let failed = false;
  async function worker() {
    while (!failed && next < cases.length) {
      const [id, mode] = cases[next++];
      const result = await new Promise((resolve, reject) => {
        const args = ['src/platform/node/cli/baseline.js', 'removal', id, '--working'];
        if (mode === 'disabled') args.push('--off');
        const output = fs.createWriteStream(path.join(logs, `${id}-${mode}.log`));
        const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
        child.stdout.pipe(output, { end: false });
        child.stderr.pipe(output, { end: false });
        child.on('error', reject);
        child.on('close', code => output.end(() => resolve(code)));
      });
      const log = fs.readFileSync(path.join(logs, `${id}-${mode}.log`), 'utf8');
      if (result !== 0) failed = true;
      assert.equal(result, 0, `${id} ${mode}:\n${log}`);
      assert.match(log, /manifest, modules, typecheck, tests and bundle all pass/);
      t.diagnostic(`${id}: ${mode} passes`);
    }
  }
  // Separate source copies share read-only installed packages; limit concurrent compilers.
  const results = await Promise.allSettled([worker(), worker()]);
  for (const result of results) if (result.status === 'rejected') throw result.reason;
});
