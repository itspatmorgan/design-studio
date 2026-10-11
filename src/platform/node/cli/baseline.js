// Maintainer tool: measures how modular the platform is and how fast it builds, so a refactor can show
// it changed neither the product nor the speed. Everything runs in a scratch copy under the system
// temp folder; the repo is only read.
//   node src/platform/node/cli/baseline.js coupling            which source files name each module
//   node src/platform/node/cli/baseline.js build [dir]         build time, manifest size, bundle size (default: a scratch copy of this repo)
//   node src/platform/node/cli/baseline.js removal <module>    delete a module in a scratch copy, then check the app still builds ("none" is the control);
//                                                with --off, turn it off in studio.config.ts instead and keep its files
//   node src/platform/node/cli/baseline.js fixture <count>     a scratch copy with <count> synthetic prototypes, then build it
// Copies the committed files; add --working to include uncommitted changes, --keep to keep the copy. Modules: the names below. A removal that fails at a step shows which module the platform still depends on.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { MODULE_ROOTS } from '../../core/roots.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

// A module's own files (what removing it deletes) and the words that mean source code is using it.
const MODULES = {
  contributors: { paths: ['src/platform/modules/contributors'], pattern: 'modules/contributors' },
  onboarding: { paths: ['src/platform/modules/onboarding'], pattern: "modules/onboarding|'onboarding'" },
  documentation: { paths: ['src/platform/modules/documentation'], pattern: "modules/documentation|'documentation'" },
  systems: {
    paths: [
      'src/systems',
      'src/platform/systems',
      'src/platform/modules/systems/pages',
      'src/platform/modules/systems/data/loadDocs.ts',
    ],
    pattern: 'systems',
  },
  canvas: { paths: ['src/platform/modules/canvas'], pattern: 'excalidraw|canvas' },
  diagrams: { paths: ['src/platform/modules/diagrams'], pattern: 'modules/diagrams' },
  document: { paths: ['src/platform/modules/document'], pattern: 'modules/document' },
  view: { paths: ['src/platform/modules/view'], pattern: 'modules/view' },
  text: { paths: ['src/platform/modules/text'], pattern: 'modules/text' },
};

// Tools run straight from node_modules: pnpm would stop to re-check dependencies in a scratch copy.
const VITE = ['node_modules/vite/bin/vite.js', 'build'];
const TESTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  .scripts.test.replace(/^node /, '')
  .split(' ');

const SKIP_COPY = new Set(['node_modules', 'dist', '.git']);
const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), `studio-${name}-`));
const kb = n => `${(n / 1024).toFixed(0)} KB`;

function run(cwd, cmd, args) {
  const start = performance.now();
  try {
    // The scratch copy's mise.toml is new to mise, so trust it for these commands only.
    const env = { ...process.env, MISE_TRUSTED_CONFIG_PATHS: cwd };
    execFileSync(cmd, args, {
      cwd,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { ok: true, seconds: (performance.now() - start) / 1000 };
  } catch (e) {
    const text = `${e.stdout || ''}${e.stderr || ''}`.trim().split('\n');
    return { ok: false, seconds: (performance.now() - start) / 1000, tail: text.slice(-8).join('\n') };
  }
}

// A copy of the repo's committed files, so work in progress doesn't count; node_modules is linked, not
// copied. With --working it copies the working tree instead, for measuring a change before committing.
function scratchCopy(name) {
  const dest = tmp(name);
  if (process.argv.includes('--working')) {
    fs.cpSync(ROOT, dest, { recursive: true, filter: src => !SKIP_COPY.has(path.basename(src)) });
  } else {
    const archive = path.join(dest, '.head.tar');
    execFileSync('git', ['archive', '--format=tar', '-o', archive, 'HEAD'], { cwd: ROOT });
    execFileSync('tar', ['-xf', archive, '-C', dest]);
    fs.rmSync(archive);
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dest, 'node_modules'), 'dir');
  return dest;
}

// Scratch copies are deleted when done unless --keep is given. The linked node_modules is only unlinked.
const discard = dir => {
  if (!process.argv.includes('--keep')) fs.rmSync(dir, { recursive: true, force: true });
};

function sizeOf(dir, keep = () => true) {
  let raw = 0,
    gz = 0,
    files = 0;
  const walk = d => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (keep(full)) {
        const buf = fs.readFileSync(full);
        raw += buf.length;
        gz += zlib.gzipSync(buf).length;
        files++;
      }
    }
  };
  walk(dir);
  return { raw, gz, files };
}

function coupling() {
  const rows = [];
  for (const [id, m] of Object.entries(MODULES)) {
    let out = '';
    try {
      out = execFileSync(
        'git',
        [
          'grep',
          '-lEi',
          m.pattern,
          '--',
          'src',
          'vite.config.ts',
          'package.json',
          'tsconfig.app.json',
          'tsconfig.node.json',
          ':!*.md',
          ':!*.mdx',
          ':!*.excalidraw',
          ':!src/prototypes',
          ':!src/platform/app',
          ':!src/platform/context',
          ':!src/platform/core',
          ':!src/platform/skills',
          ':!*.test.ts',
          ...MODULE_ROOTS.map(root => `:!${root}`),
          ...m.paths.map(p => `:!${p}`),
        ],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
    } catch (e) {
      if (e.status !== 1) throw e; // git grep exits 1 when nothing matches
    }
    rows.push({ module: id, files: out.split('\n').filter(Boolean).length });
  }
  console.log(
    'Source files outside a module that name it, not counting the module declarations (fewer is better; 0 means removable):',
  );
  console.table(rows);
}

function build(dir) {
  const manifest = run(dir, 'node', ['src/platform/node/build/build-manifest.js', '--deploy']);
  const bundle = manifest.ok ? run(dir, 'node', VITE) : { ok: false, seconds: 0, tail: manifest.tail };
  if (!bundle.ok) {
    console.error(`build failed:\n${bundle.tail}`);
    return null;
  }
  const m = sizeOf(path.join(dir, 'public', 'prototypes'));
  const assets = sizeOf(path.join(dir, 'dist'), f => /\.(js|css)$/.test(f));
  const result = {
    manifestSeconds: +manifest.seconds.toFixed(1),
    bundleSeconds: +bundle.seconds.toFixed(1),
    manifestFiles: m.files,
    manifestSize: kb(m.raw),
    bundleFiles: assets.files,
    bundleSize: kb(assets.raw),
    bundleGzip: kb(assets.gz),
  };
  console.table([result]);
  return result;
}

// The steps a healthy app passes, in order. The first to fail is what still depends on the removed module.
const STEPS = [
  ['manifest', 'node', ['src/platform/node/build/build-manifest.js', '--strict', '--deploy']],
  ['modules', 'node', ['src/platform/node/check/check-modules.js']],
  ['typecheck', 'node', ['node_modules/typescript/bin/tsc', '-b']],
  ['tests', 'node', TESTS],
  ['bundle', 'node', VITE],
];

function removal(id) {
  const m = id === 'none' ? { paths: [] } : MODULES[id]; // "none" removes nothing: the app must pass as it is
  if (!m) {
    console.error(`Unknown module "${id}". Modules: ${Object.keys(MODULES).join(', ')}.`);
    process.exit(2);
  }
  const dir = scratchCopy(`remove-${id}`);
  try {
    if (id === 'contributors') {
      const personal = run(dir, 'node', [
        'src/platform/node/cli/studio.js',
        'configure',
        '--usage',
        'personal',
        '--recovery',
        '--yes',
      ]);
      if (!personal.ok) {
        console.log(`${id}: FAILS at personal configuration\n${personal.tail}`);
        return false;
      }
      console.log('Checking Contributors & Permissions availability in personal use. Team use requires it.');
    }
    if (id !== 'none') {
      const args = process.argv.includes('--off') ? ['disable', id] : ['remove', id, '--yes'];
      const operation = run(dir, 'node', ['src/platform/node/cli/studio.js', ...args]);
      if (!operation.ok) {
        console.log(`${id}: FAILS at capability change\n${operation.tail}`);
        return false;
      }
    }
    for (const [name, cmd, args] of STEPS) {
      const r = run(dir, cmd, args);
      if (!r.ok) {
        console.log(`${id}: FAILS at ${name}\n${r.tail}`);
        return false;
      }
    }
    console.log(`${id}: removable (manifest, modules, typecheck, tests and bundle all pass)`);
    return true;
  } finally {
    discard(dir);
  }
}

// Synthetic prototypes: a view, a document and a meta.json each, spread over contributors.
function fixture(count) {
  const dir = scratchCopy(`fixture-${count}`);
  const people = Math.max(1, Math.round(Math.sqrt(count) / 2));
  fs.mkdirSync(path.join(dir, 'contributors'), { recursive: true });
  for (let p = 0; p < people; p++)
    fs.writeFileSync(
      path.join(dir, 'contributors', `person${p}.json`),
      JSON.stringify({ name: `Person ${p}`, github: `person${p}`, email: '', welcomeDismissed: false }),
    );
  for (let i = 0; i < count; i++) {
    const who = `person${i % people}`;
    const proto = path.join(dir, 'src', 'prototypes', who, `proto-${i}`);
    fs.mkdirSync(proto, { recursive: true });
    fs.writeFileSync(path.join(proto, 'meta.json'), JSON.stringify({ title: `Prototype ${i}`, created: '2026-01-01' }));
    fs.writeFileSync(
      path.join(proto, 'screen.tsx'),
      `export default function Screen() {\n  return <div className="p-4">Prototype ${i}</div>;\n}\n`,
    );
    fs.writeFileSync(path.join(proto, 'notes.md'), `# Notes ${i}\n\nSynthetic.\n`);
  }
  console.log(`fixture: ${count} prototypes`);
  try {
    return build(dir);
  } finally {
    discard(dir);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'coupling') coupling();
else if (cmd === 'build') {
  const dir = arg && !arg.startsWith('--') ? path.resolve(arg) : scratchCopy('build');
  try {
    build(dir);
  } finally {
    if (dir.startsWith(os.tmpdir()) || dir.startsWith(fs.realpathSync(os.tmpdir()))) discard(dir);
  }
} else if (cmd === 'removal') process.exit(removal(arg) ? 0 : 1);
else if (cmd === 'fixture') {
  const n = Number(arg);
  if (!Number.isInteger(n) || n < 1 || n > 20000) {
    console.error('Give a count from 1 to 20000.');
    process.exit(2);
  }
  fixture(n);
} else {
  console.error(
    'Usage: node src/platform/node/cli/baseline.js coupling | build [dir] | removal <module> | fixture <count>',
  );
  process.exit(2);
}
