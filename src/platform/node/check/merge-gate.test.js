import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

test('the required CI gate fails when either build or regressions fail, cancel, or skip', () => {
  const workflow = fs.readFileSync(new URL('../../../../.github/workflows/checks.yml', import.meta.url), 'utf8');
  const gate = workflow.slice(workflow.indexOf('  build:'));
  const script = gate
    .match(/run: \|\n((?:          .*\n)+)/)[1]
    .split('\n')
    .filter(Boolean)
    .map(line => line.slice(10))
    .join('\n');
  for (const bundle of ['success', 'failure', 'cancelled', 'skipped'])
    for (const regressions of ['success', 'failure', 'cancelled', 'skipped']) {
      const result = spawnSync('bash', ['-c', script], {
        env: { ...process.env, BUNDLE_RESULT: bundle, REGRESSION_RESULT: regressions },
      });
      assert.equal(result.status === 0, bundle === 'success' && regressions === 'success', `${bundle}/${regressions}`);
    }
});
