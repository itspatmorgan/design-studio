// pnpm release <version> [--dry-run]: cut a platform release on a clean, up-to-date main (src/platform/context/releasing.md).
// Sets PLATFORM_VERSION, refreshes the contract snapshot, dates the CHANGELOG's Unreleased section, runs check, contract
// and build, commits "Release v<version>" and tags v<version>. It never pushes: it prints the push command.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyRelease, pushCommand, releasePlan } from '../lib/release.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(2).filter(arg => arg !== '--');
const dryRun = args.includes('--dry-run');
const positional = args.filter(arg => arg !== '--dry-run');
const unknown = positional.filter(arg => arg.startsWith('--'));
if (positional.length !== 1 || unknown.length) {
  console.error('Usage: pnpm release <version> [--dry-run]   (for example: pnpm release 0.2.1)');
  process.exit(1);
}

const plan = releasePlan(ROOT, positional[0]);
console.log(`Release ${plan.tag ?? positional[0]}${dryRun ? ' (dry run: nothing will change)' : ''}`);
console.log(`  PLATFORM_VERSION: ${plan.current ?? 'unknown'} -> ${plan.version ?? '?'}`);
console.log(
  `  CHANGELOG: "## Unreleased" becomes "## ${plan.version ?? '?'} (${plan.date})", with a new empty Unreleased above it`,
);
console.log('  Then: pnpm contract --update, pnpm check, pnpm contract --released, pnpm build');
console.log(`  Commit "Release ${plan.tag ?? '?'}" and annotated tag ${plan.tag ?? '?'}, both local`);
if (plan.notes) console.log(`\nRelease notes:\n${plan.notes}`);
if (plan.problems.length) {
  console.error(`\nCan't release:\n${plan.problems.map(problem => `  - ${problem}`).join('\n')}`);
  process.exit(1);
}
if (dryRun) {
  console.log(`\nDry run: nothing changed. When it is cut, push it with:\n  ${pushCommand(plan)}`);
  process.exit(0);
}
try {
  const result = applyRelease(ROOT, plan, {
    run: (command, commandArgs) => execFileSync(command, commandArgs, { cwd: ROOT, stdio: 'inherit' }),
  });
  console.log(`\nCommitted ${result.commit.slice(0, 7)} and tagged ${result.tag}. Nothing was pushed.`);
  console.log(`Review it, then push the commit and the tag together:\n  ${pushCommand(plan)}`);
} catch (error) {
  console.error(`\nThe release stopped and the files were restored: ${error.message}`);
  process.exit(1);
}
