// Fails when an API export has no stability tag, or the platform's public contract changes without a
// PLATFORM_VERSION change (src/platform/node/lib/contract.js).
// Usage: node src/platform/node/check/check-contract.js [--update]   (pnpm contract --update rewrites the snapshot)
import { fileURLToPath } from 'node:url';
import {
  SNAPSHOT_FILE,
  apiProblems,
  computeContract,
  contractProblems,
  readSnapshot,
  writeSnapshot,
} from '../lib/contract.js';

export function checkContract() {
  return contractProblems(computeContract(), readSnapshot(), apiProblems());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--update')) {
    const untagged = apiProblems();
    if (untagged.length) {
      console.error(untagged.map(p => `[contract] ${p}`).join('\n'));
      process.exit(1);
    }
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
