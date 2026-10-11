// Fails when the platform's public contract changes without a PLATFORM_VERSION change (scripts/lib/contract.js).
// Usage: node scripts/check/check-contract.js [--update]   (pnpm contract --update rewrites the snapshot)
import { fileURLToPath } from 'node:url';
import { SNAPSHOT_FILE, computeContract, contractProblems, readSnapshot, writeSnapshot } from '../lib/contract.js';

export function checkContract() {
  return contractProblems(computeContract(), readSnapshot());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--update')) {
    writeSnapshot(computeContract());
    console.log(`[contract] Wrote ${SNAPSHOT_FILE}`);
  } else {
    const problems = checkContract();
    if (problems.length) {
      console.error(problems.map(p => `[contract] ${p}`).join('\n'));
      process.exit(1);
    }
    console.log('[contract] platform contract matches its snapshot');
  }
}
