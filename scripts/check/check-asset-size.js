// Usage:
//   node scripts/check/check-asset-size.js --staged              (pre-commit, blocks the commit)
//   node scripts/check/check-asset-size.js --ci <before> <after> (CI, fails the check)
//
// Blocks files over the limit from entering the repo. Git keeps every version of every
// file forever, so one big image makes every future clone slower. Only added or modified
// files are checked, so a large file already in the repo is flagged only if you change it.
import { changedFiles, git } from './changed-files.js';

const LIMIT_KB = 750;

// Files allowed over the limit, each with a one-line reason. Add one only when the file
// can't be compressed or resized.
const ALLOWLIST = [
  // 'src/prototypes/patrick/demo/assets/walkthrough.mp4',  // already compressed
];

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

// The size Git will store: the staged version, or the version in the pushed commit.
const sizeKB = file => Number(git('cat-file', '-s', mode === '--staged' ? `:${file}` : `${after}:${file}`)) / 1024;

const oversized = changed.files
  .filter(f => !ALLOWLIST.includes(f))
  .map(f => ({ file: f, kb: sizeKB(f) }))
  .filter(({ kb }) => kb > LIMIT_KB);

if (oversized.length) {
  console.error(`Asset size check: ${oversized.length} file(s) over ${LIMIT_KB} KB.`);
  for (const { file, kb } of oversized) console.error(`  ${file}: ${Math.round(kb)} KB`);
  console.error('Make it smaller before committing: export images as WebP (or compressed JPEG),');
  console.error('at the size they are shown. A full-screen image is usually 100-300 KB as WebP.');
  if (mode === '--staged')
    console.error(
      "Then stage the new file. If it truly can't be smaller, add it to ALLOWLIST in scripts/check/check-asset-size.js.",
    );
  process.exit(1);
}
