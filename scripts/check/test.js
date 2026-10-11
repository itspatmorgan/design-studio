// Discover retained tests; optional module removal also removes its tests.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { discoverTests, planTests } from './test-selection.js';

const args = process.argv.slice(2);
let files;
if (args[0] === '--changed') {
  const [base, head, ...options] = args.slice(1);
  if (options.some(option => !['--plan-only', '--full', '--merge-base'].includes(option)))
    throw new Error('Usage: test.js --changed <base> <head> [--plan-only] [--full] [--merge-base]');
  const plan = planTests(base, head, {
    full: options.includes('--full') || process.env.STUDIO_FULL_CHECKS === 'true',
    mergeBase: options.includes('--merge-base') || process.env.GITHUB_EVENT_NAME === 'pull_request',
  });
  console.log(JSON.stringify(plan, null, 2));
  if (options.includes('--plan-only')) {
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `tests_needed=${plan.tests.length > 0}\n`);
    if (process.env.GITHUB_STEP_SUMMARY)
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `## Verification plan\n\n${plan.full ? 'Full suite' : plan.groups.join(', ') || 'Authoring: production checks only'} (${plan.tests.length} test files).\n\n${plan.reasons.map(reason => '- ' + reason.replace(/[\r\n]/g, ' ')).join('\n')}\n`,
      );
    process.exit(0);
  }
  files = plan.tests;
} else {
  if (args.some(arg => arg !== '--release'))
    throw new Error('Usage: test.js [--release] | --changed <base> <head> [--plan-only] [--full] [--merge-base]');
  files = discoverTests().filter(
    file =>
      args.includes('--release') || (!file.endsWith('.integration.test.js') && !file.startsWith('scripts/plugins/')),
  );
  if (!files.length) throw new Error('No retained regression tests found.');
}
if (!files.length) {
  console.log('No regression groups selected. Production and scope checks remain required.');
  process.exit(0);
}
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
