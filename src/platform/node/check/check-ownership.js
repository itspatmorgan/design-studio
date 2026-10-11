// Reports tracked paths the ownership map (.studio/ownership.json, src/platform/context/ownership.md) does not cover,
// paths two tiers claim, and the declared mixed files. A conflicting path, or a map that cannot be read,
// is an error (exit 1). With --strict, which the upstream project's CI passes, an unknown path is an error too; in a
// studio it is the team's own. Mixed files are informational: package.json is the one intentionally mixed file. This is
// not the contributor scope check (check-scope.js), whose personal-studio skip is unchanged.
// Usage: node src/platform/node/check/check-ownership.js [--strict] [--json]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ownershipReport } from '../lib/ownership.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const CAP = 10;

// What fails the check. A map that cannot be read and conflicting rules fail everywhere, since only upstream edits the
// map. A path the map does not name is the team's own, so it fails only for the upstream project (`strict`).
export const ownershipFails = (report, { strict = false } = {}) =>
  report.problems.length > 0 || report.conflicts.length > 0 || (strict && report.unknown.length > 0);

export function printOwnership(report, log = console.log, { strict = false } = {}) {
  const cap = (items, show) => {
    items.slice(0, CAP).forEach(i => log(`[ownership]   ${show(i)}`));
    if (items.length > CAP) log(`[ownership]   ... and ${items.length - CAP} more`);
  };
  for (const p of report.problems) log(`[ownership] error: ${p}`);
  if (report.unknown.length) {
    log(
      strict
        ? `[ownership] error: ${report.unknown.length} tracked path(s) match no rule. Add them to .studio/ownership.json:`
        : `[ownership] ${report.unknown.length} tracked path(s) match no rule and are treated as team-owned:`,
    );
    cap(report.unknown, f => f);
  }
  if (report.conflicts.length) {
    log(`[ownership] error: ${report.conflicts.length} tracked path(s) match rules of different tiers:`);
    cap(report.conflicts, c => `${c.path} (${c.tiers.join(' vs ')})`);
  }
  log(
    `[ownership] ${report.files} tracked file(s): ${report.unknown.length} unknown, ${report.conflicts.length} conflicting, ${report.mixed.length} mixed (${report.mixed.join(', ') || 'none'})`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const strict = process.argv.includes('--strict');
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
  else printOwnership(report, console.log, { strict });
  if (ownershipFails(report, { strict })) process.exit(1);
}
