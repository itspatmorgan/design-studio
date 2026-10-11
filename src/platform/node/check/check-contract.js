// Snapshot freshness, public release compatibility, and PR-base review (context/checks.md).
// Usage: check-contract.js [--update] [--released] [--base <revision>]
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { releasedBaseline, releasedProblems, reviewChanges } from '../lib/released-contract.js';
import {
  SNAPSHOT_FILE,
  apiProblems,
  computeContract,
  contractProblems,
  readSnapshot,
  writeSnapshot,
} from '../lib/contract.js';

export function checkContract({ released = false } = {}) {
  const current = computeContract();
  const problems = contractProblems(current, readSnapshot(), apiProblems());
  if (released)
    problems.push(...releasedProblems(current, releasedBaseline(path.resolve('.'), current.platformVersion)));
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--update') && (process.argv.includes('--released') || process.argv.includes('--base')))
    throw new Error('Run --update separately, then verify with --released or --base.');
  if (process.argv.includes('--update')) {
    const untagged = apiProblems();
    if (untagged.length) {
      console.error(untagged.map(p => `[contract] ${p}`).join('\n'));
      process.exit(1);
    }
    writeSnapshot(computeContract());
    console.log(`[contract] Wrote ${SNAPSHOT_FILE}`);
  } else {
    const problems = checkContract({ released: process.argv.includes('--released') });
    const baseAt = process.argv.indexOf('--base');
    if (baseAt >= 0) {
      const ref = process.argv[baseAt + 1];
      if (!ref || ref.startsWith('--')) throw new Error('--base requires a Git revision.');
      const changed = reviewChanges(path.resolve('.'), computeContract(), ref);
      console.log(`[contract] Review against ${ref}: ${changed.length} recorded change(s).`);
      for (const line of changed) console.log(`  ${line}`);
    }
    if (problems.length) {
      console.error(problems.map(p => `[contract] ${p}`).join('\n'));
      process.exit(1);
    }
    console.log('[contract] platform contract matches its snapshot');
  }
}
