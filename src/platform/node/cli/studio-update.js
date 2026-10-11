// pnpm studio update [version] [--dry-run] | --continue: take an upstream release on a branch of its own
// (src/platform/node/lib/studio-update.js). It never pushes and never changes the branch it started from.
// Routed here by studio.js before the runtime loads, so a studio whose settings don't validate can still update.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyUpdate, continueUpdate, planUpdate } from '../lib/studio-update.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(3).filter(arg => arg !== '--');
const flags = new Set(args.filter(arg => arg.startsWith('--')));
const positional = args.filter(arg => !arg.startsWith('--'));
const say = (line = '') => console.log(line);
const fail = message => {
  console.error(message);
  process.exit(1);
};
const unknown = [...flags].filter(flag => !['--dry-run', '--continue'].includes(flag));
if (
  unknown.length ||
  positional.length > 1 ||
  (flags.has('--continue') && (positional.length || flags.has('--dry-run')))
)
  fail('Usage: pnpm studio update [version] [--dry-run]\n       pnpm studio update --continue');
const run = (command, commandArgs) => execFileSync(command, commandArgs, { cwd: ROOT, stdio: 'inherit' });
const short = sha => sha.slice(0, 7);

const reportVerification = (result, plan) => {
  say();
  if (result.checks === 'failed') {
    say(`The update to ${plan.tag} is committed on ${plan.branch}, but pnpm ${result.failed} failed (see above).`);
    say('Ask your agent to fix the problem on this branch, then run pnpm check and pnpm build again.');
    process.exitCode = 1;
  } else say(`Updated to Design Studio ${plan.tag} on ${plan.branch}. pnpm check and pnpm build passed.`);
  say(
    `Next: review what the update changed (git diff ${plan.branch}^1 ${plan.branch}), try the studio with pnpm dev, then merge ${plan.branch} into ${plan.originalBranch ?? 'the branch you started from'}, for example with a pull request.`,
  );
  say('Nothing was pushed.');
};

if (flags.has('--continue')) {
  try {
    const result = continueUpdate(ROOT, { run, log: say });
    const branch = `studio-update/v${result.version}`;
    reportVerification(result, { tag: `v${result.version}`, branch, originalBranch: null });
  } catch (error) {
    fail(error.message);
  }
} else {
  const plan = planUpdate(ROOT, positional[0]);
  if (plan.problems.length) {
    console.error(`Can't update:\n${plan.problems.map(problem => `  - ${problem}`).join('\n')}`);
    if (plan.help) console.error(`\nTo add it, run:\n${plan.help.map(line => `  ${line}`).join('\n')}`);
    process.exit(1);
  }
  const installed = plan.installed
    ? `v${plan.installed.version} (${short(plan.installed.commit)}, from studio.lock.json${plan.installed.known ? '' : '; that commit is not in this repository'})`
    : 'unknown (studio.lock.json does not record it yet)';
  say(`Installed release: ${installed}`);
  say(`Target release:    ${plan.tag} (${short(plan.commit)})`);
  if (plan.upToDate) {
    say(`\nThis studio already has Design Studio ${plan.tag}. Nothing to do.`);
    process.exit(0);
  }
  say(
    `Changes:           ${plan.commits} upstream commit(s), ${short(plan.base)}..${short(plan.commit)} (base from ${plan.baseSource === 'lock' ? 'studio.lock.json' : 'Git merge base'}), ${plan.upstreamChanged.length} file(s)`,
  );
  if (plan.overlap.length) {
    say(`\nFiles this release changes that your studio changed too (${plan.overlap.length}):`);
    for (const entry of plan.overlap) say(`  ${entry.file}  [${entry.tier}] ${entry.resolution}`);
  } else say('\nYour studio has not changed any file this release changes.');
  if (flags.has('--dry-run')) {
    say(`\nDry run: nothing changed. Without --dry-run, the update is made on a new branch, ${plan.branch}.`);
    process.exit(0);
  }
  say();
  const result = applyUpdate(ROOT, plan, { run, log: say });
  if (!result.merged) {
    say(
      `\nThe update stopped on ${plan.branch}: these files changed in ${plan.tag} and in your studio, and need a person:`,
    );
    for (const file of result.conflicts) say(`  ${file}`);
    say('\nChoose one:');
    say(
      '  - Resolve them: edit each file to keep what you need from both sides, git add it, then run pnpm studio update --continue.',
    );
    say(
      `    It regenerates the generated files, records ${plan.tag} in studio.lock.json, commits, and runs the checks.`,
    );
    say(
      `  - Or give up for now: git merge --abort, then git switch ${plan.originalBranch ?? '-'} and git branch -D ${plan.branch}.`,
    );
    say(`\n${plan.originalBranch ?? 'Your branch'} is unchanged. Nothing was pushed.`);
    process.exit(1);
  }
  reportVerification(result, plan);
}
