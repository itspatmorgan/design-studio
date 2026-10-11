// Machine-readable form of src/platform/context/ownership.md: .studio/ownership.json maps tracked paths to an owner tier.
// A path takes the tier of its most specific rule (longest literal prefix; exact paths beat globs). Equally specific rules
// of different tiers conflict, and a path no rule matches is unknown. Mixed files are declared apart and skip the tiers.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { matches } from '../check/test-selection.js';

export const TIERS = ['upstream', 'generated', 'seed', 'team'];
export const loadOwnership = (root) => JSON.parse(fs.readFileSync(path.join(root, '.studio/ownership.json'), 'utf8'));
export const trackedFiles = (root) => execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
const specificity = (glob) => { const at = glob.indexOf('*'); return at < 0 ? glob.length + 1 : at; };

export function mapProblems(map) {
  if (map?.schema !== 1 || !Array.isArray(map.rules)) return ['.studio/ownership.json must have schema 1 and a rules array.'];
  const list = (paths) => Array.isArray(paths) && paths.length && paths.every((p) => typeof p === 'string' && p);
  const problems = map.rules.flatMap((r, i) => [!TIERS.includes(r?.tier) && `Rule ${i} has tier ${JSON.stringify(r?.tier)}; use ${TIERS.join(', ')}.`, !list(r?.paths) && `Rule ${i} needs a non-empty paths array.`].filter(Boolean));
  (map.mixed ?? []).forEach((m, i) => { if (!list(m?.paths) || !m.reason) problems.push(`Mixed entry ${i} needs paths and a reason.`); });
  return problems;
}

// The tier of one path: a tier name, 'mixed', 'unknown', or { conflict: { tiers, globs } } when equally specific rules disagree.
export function tierOf(map, file) {
  if ((map.mixed ?? []).some((m) => m.paths.some((g) => matches(file, g)))) return 'mixed';
  let best = -1, hits = [];
  for (const r of map.rules) for (const g of r.paths) {
    if (!matches(file, g)) continue;
    const s = specificity(g);
    if (s > best) { best = s; hits = []; }
    if (s === best) hits.push({ tier: r.tier, glob: g });
  }
  const found = [...new Set(hits.map((h) => h.tier))];
  if (!hits.length) return 'unknown';
  return found.length > 1 ? { conflict: { tiers: found, globs: hits.map((h) => h.glob) } } : found[0];
}

export function classify(map, files) {
  const unknown = [], conflicts = [], mixed = [], tiers = Object.fromEntries(TIERS.map((t) => [t, 0]));
  for (const file of files) {
    const tier = tierOf(map, file);
    if (tier === 'mixed') mixed.push(file);
    else if (tier === 'unknown') unknown.push(file);
    else if (tier.conflict) conflicts.push({ path: file, ...tier.conflict });
    else tiers[tier]++;
  }
  return { unknown, conflicts, mixed, tiers };
}

export const ownershipReport = (root, files = trackedFiles(root)) => {
  const map = loadOwnership(root), problems = mapProblems(map);
  return { files: files.length, problems, ...(problems.length ? { unknown: [], conflicts: [], mixed: [], tiers: {} } : classify(map, files)) };
};
