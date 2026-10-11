// Reports tracked paths the ownership map (.studio/ownership.json, src/platform/context/ownership.md) does not cover,
// paths two tiers claim, and the declared mixed files. Warning mode: always exits 0.
// Usage: node scripts/check/check-ownership.js [--json]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ownershipReport } from '../lib/ownership.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CAP = 10;
export function printOwnership(report, log = console.log) {
  const cap = (items, show) => {
    items.slice(0, CAP).forEach(i => log(`[ownership]   ${show(i)}`));
    if (items.length > CAP) log(`[ownership]   ... and ${items.length - CAP} more`);
  };
  for (const p of report.problems) log(`[ownership] warning: ${p}`);
  if (report.unknown.length) {
    log(
      `[ownership] warning: ${report.unknown.length} tracked path(s) match no rule. Add them to .studio/ownership.json:`,
    );
    cap(report.unknown, f => f);
  }
  if (report.conflicts.length) {
    log(`[ownership] warning: ${report.conflicts.length} tracked path(s) match rules of different tiers:`);
    cap(report.conflicts, c => `${c.path} (${c.tiers.join(' vs ')})`);
  }
  log(
    `[ownership] ${report.files} tracked file(s): ${report.unknown.length} unknown, ${report.conflicts.length} conflicting, ${report.mixed.length} mixed (${report.mixed.join(', ') || 'none'})`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let report;
  try {
    report = ownershipReport(ROOT);
  } catch (e) {
    report = {
      files: 0,
      problems: [`The ownership map could not be checked (${e.message}).`],
      unknown: [],
      conflicts: [],
      mixed: [],
      tiers: {},
    };
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else printOwnership(report);
}
