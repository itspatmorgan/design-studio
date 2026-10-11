import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('the actual required CI script fails on an unsuccessful required upgrade and accepts intentional skips', () => {
  const root = path.resolve(import.meta.dirname, '../../../..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/checks.yml'), 'utf8');
  const gate = workflow.slice(workflow.indexOf('  build:'), workflow.indexOf('  deploy:'));
  assert.match(gate, /needs: \[bundle, regressions, upgrade\]/);
  assert.match(
    gate,
    /github.repository == 'itspatmorgan\/design-studio-starter' && github.event_name == 'pull_request'/,
  );
  const script = gate
    .match(/run: \|\n((?:          .*\n)+)/)[1]
    .split('\n')
    .filter(Boolean)
    .map(line => line.slice(10))
    .join('\n');
  for (const [bundle, regressions, upgrade, required, success] of [
    ['success', 'success', 'success', 'true', true],
    ['success', 'success', 'failure', 'true', false],
    ['success', 'success', 'skipped', 'true', false],
    ['success', 'success', 'cancelled', 'true', false],
    ['success', 'success', 'skipped', 'false', true],
    ['failure', 'success', 'success', 'true', false],
    ['success', 'failure', 'success', 'false', false],
  ]) {
    const result = spawnSync('bash', ['-c', script], {
      env: {
        ...process.env,
        BUNDLE_RESULT: bundle,
        REGRESSION_RESULT: regressions,
        UPGRADE_RESULT: upgrade,
        UPGRADE_REQUIRED: required,
      },
      encoding: 'utf8',
    });
    assert.equal(
      result.status === 0,
      success,
      `${bundle}/${regressions}/${upgrade}, required=${required}: ${result.stderr}`,
    );
  }
});
