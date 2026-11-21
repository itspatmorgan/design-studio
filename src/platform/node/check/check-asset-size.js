// Usage:
//   node src/platform/node/check/check-asset-size.js --staged              (pre-commit, blocks the commit)
//   node src/platform/node/check/check-asset-size.js --ci <before> <after> (CI, fails the check)
//
// Blocks files over the limit from entering the repo. Git keeps every version of every
// file forever, so one big image makes every future clone slower. Only added or modified
// files are checked, so a large file already in the repo is flagged only if you change it.
// A team sets its own limit and approves files over it in studio.config.json's assetGuard,
// read from the same commit (or staged copy) as the files, so an approval counts once committed.
import { changedFiles, git } from './changed-files.js';
import { ASSET_LIMIT_KB, CONFIG_FILE, assetGuardProblems } from '../../core/config.ts';
import { parseConfigFile } from '../../core/config-file.ts';

const GUIDE = 'src/platform/context/assets.md#large-files';

const [mode, before, after] = process.argv.slice(2);
let changed;
try {
  changed = changedFiles(mode, before, after, { filter: 'AM' });
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
if (!changed || mode === '--push') {
  console.error('Usage: check-asset-size.js --staged | --ci <before> <after>');
  process.exit(2);
}

// The team's assetGuard from the version of studio.config.json being checked. A repository with no studio.config.json
// (not a studio) gets the default limit and no exceptions.
const at = file => (mode === '--staged' ? `:${file}` : `${after}:${file}`);
let guard;
try {
  const text = git('show', at(CONFIG_FILE));
  const parsed = parseConfigFile(text);
  if ('error' in parsed) throw new Error(parsed.error);
  const problems = assetGuardProblems(parsed.value.assetGuard);
  if (problems.length) throw new Error(problems.join('\n'));
  guard = parsed.value.assetGuard;
} catch (e) {
  if (e.status === undefined) {
    console.error(`Asset size check: ${e.message}`);
    process.exit(2);
  }
  guard = { limitKB: ASSET_LIMIT_KB, exceptions: [] }; // git show failed: this tree has no studio.config.json.
}
const { limitKB } = guard;
const approved = new Set(guard.exceptions.map(entry => entry.path));

// The size Git will store: the staged version, or the version in the pushed commit.
const sizeKB = file => Number(git('cat-file', '-s', at(file))) / 1024;

const oversized = changed.files
  .filter(f => !approved.has(f))
  .map(f => ({ file: f, kb: sizeKB(f) }))
  .filter(({ kb }) => kb > limitKB);

if (oversized.length) {
  console.error(`Asset size check: ${oversized.length} file(s) over ${limitKB} KB.`);
  for (const { file, kb } of oversized) console.error(`  ${file}: ${Math.round(kb)} KB`);
  console.error('Make it smaller: export images as WebP (or compressed JPEG) at the size they are shown.');
  console.error('A full-screen image is usually 100-300 KB as WebP.');
  console.error(
    `If your team decides to keep it this size, add { "path": "<file>", "reason": "<why>" } to assetGuard.exceptions in ${CONFIG_FILE}${mode === '--staged' ? ' and stage that too' : ' in this change'}.`,
  );
  console.error(`Before allowing large media, read why Git handles it badly and what to use instead: ${GUIDE}`);
  process.exit(1);
}
