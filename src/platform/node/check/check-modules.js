import { modulePlatformProblem } from '../../core/modules/boundaries.ts';
import { scopePolicy } from '../lib/scope.js';
import { dependencyResolver, importsOf, sourceFiles } from '../lib/imports.js';
// Checks the modules in src/modules/ (src/platform/core/modules/index.ts):
//   - each module.ts is well formed, and its id is its folder's name
//   - no two modules claim the same section key or folder
//   - a module's section folder exists
//   - studio.config.ts is well formed, and only turns off modules that can be turned off
//   - each design system in the system roots (src/platform/systems/ and src/systems/, src/platform/core/roots.ts) has a well formed system.ts, components/, and styles/theme.css
//   - no contributor, and no folder in src/prototypes/, uses a section key, since both are addresses
//   - nothing outside an optional module imports its files other than its module.ts, and no module imports an
//     optional one, so deleting its folder leaves nothing broken (a required module is part of the platform,
//     so the platform and the other modules may import it)
//   - a file type (a module with a type.ts, src/platform/context/file-types.md) has an open.tsx, its type.ts imports
//     only ../../core/fileTypes.ts (the build loads it directly in Node), and its loader.ts lists its files with the
//     ['/__studio_globs__/*'] placeholder, so a new section and archived files reach it (src/platform/node/build/vite-globs-plugin.js)
// Usage: node src/platform/node/check/check-modules.js
import fs from 'node:fs';
import { themeUsageProblems } from '../lib/theme-usage.js';
import { inventories } from '../build/vite-css-plugin.js';
import { TEAM_SYSTEMS_ROOT } from '../../core/roots.ts';
import { tailwindThemeProblems } from '../lib/tailwind-theme.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { PLATFORM_VERSION, compatible, listProblems } from '../../core/modules/index.ts';
import { adminProblems, configProblems } from '../../core/config.ts';
import { CONFIG, MODULES, ENABLED_MODULES, SECTION_KEYS, PROTOTYPE_DIRS, declarationProblems } from '../lib/modules.js';
import {
  PLATFORM_ID,
  SYSTEM_SPECS,
  PROTOTYPE_SYSTEMS,
  DEFAULT_SYSTEM,
  SYSTEM_IDS,
  systemDeclarationProblems,
} from '../../../modules/systems/node/systems.js';
import { changesFromLock } from '../lib/lock.js';
import { readContributors } from '../lib/contributors.js';
import { ownershipReport } from '../lib/ownership.js';
import { printOwnership } from './check-ownership.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const problems = declarationProblems();
const specs = Object.values(MODULES).filter(m => m && typeof m === 'object');
problems.push(
  ...listProblems(specs),
  ...configProblems(CONFIG, specs, SYSTEM_IDS, PLATFORM_ID),
  ...systemDeclarationProblems(),
);
if (SYSTEM_SPECS[DEFAULT_SYSTEM]?.status !== 'active') problems.push('The default system must be active.');
if (!SYSTEM_IDS.length)
  problems.push(
    `There is no design system in ${TEAM_SYSTEMS_ROOT}/. Prototypes need one to build with: add one with pnpm studio create-system.`,
  );
if (SYSTEM_IDS.length > 1 && !CONFIG.defaultSystem)
  problems.push(
    `There are ${SYSTEM_IDS.length} design systems (${SYSTEM_IDS.join(', ')}), so say which one prototypes use when their meta.json names none: add defaultSystem: '${SYSTEM_IDS.includes('product') ? 'product' : SYSTEM_IDS[0]}', to studio.config.ts.`,
  );
for (const id of SYSTEM_IDS) {
  for (const part of ['components', 'styles/theme.css']) {
    if (!fs.existsSync(path.join(ROOT, SYSTEM_SPECS[id].dir, part)))
      problems.push(`${SYSTEM_SPECS[id].dir}${part} is missing. A design system has components/ and styles/theme.css.`);
  }
}

for (const [id, spec] of Object.entries(SYSTEM_SPECS)) {
  const file = path.join(ROOT, spec.dir, 'styles/theme.css');
  if (fs.existsSync(file)) problems.push(...tailwindThemeProblems(fs.readFileSync(file, 'utf8'), { file, ...spec }));
}

const themeSystems = inventories();
const themePrototypePolicy = scopePolicy({
  root: ROOT,
  systems: PROTOTYPE_SYSTEMS,
  defaultSystem: DEFAULT_SYSTEM,
  modules: ENABLED_MODULES,
  prototypeDirs: PROTOTYPE_DIRS,
});
const prototypeThemeFiles = [path.join(ROOT, 'src/prototypes'), ...PROTOTYPE_DIRS.map(dir => path.join(ROOT, dir))]
  .flatMap(dir => [...sourceFiles(dir)])
  .filter(file => /\.[cm]?[jt]sx?$/.test(file));
const customPrototypeTheme = {
  role: 'prototype',
  styling: 'tailwind',
  themeClass: 'prototype-unstyled',
  inventory: { base: new Map(), modes: new Map() },
};
problems.push(
  ...(await themeUsageProblems([...themeSystems, customPrototypeTheme], system => {
    if (system === customPrototypeTheme)
      return prototypeThemeFiles.filter(file => themePrototypePolicy.scopeOf(file)?.system === null);
    const dirs =
      system.role === 'platform'
        ? ['src/platform', 'src/modules', system.dir + 'components']
        : [system.dir + 'components'];
    // The platform system's components are inside src/platform, so a file can be listed by two folders.
    const files = [...new Set(dirs.flatMap(dir => [...sourceFiles(path.join(ROOT, dir))]))].filter(
      file => /\.[cm]?[jt]sx?$/.test(file) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file),
    );
    const prototypeFiles =
      system.role === 'platform'
        ? []
        : prototypeThemeFiles.filter(file => themePrototypePolicy.scopeOf(file)?.system === path.basename(system.dir));
    return [...files, ...prototypeFiles];
  })),
);

for (const m of specs) {
  if (m.section?.folder && !fs.existsSync(path.join(ROOT, m.section.folder))) {
    problems.push(
      `The ${m.id} module keeps its files in ${m.section.folder}, which doesn't exist. Create the folder, or remove the module.`,
    );
  }
}

const { contributors: contributorMap, problems: contributorProblems } = readContributors();
const contributors = Object.keys(contributorMap);
problems.push(...adminProblems(CONFIG, contributors).filter(problem => !problems.includes(problem)));
problems.push(...contributorProblems);
const protoDir = path.join(ROOT, 'src', 'prototypes');
const folders = fs.existsSync(protoDir)
  ? fs
      .readdirSync(protoDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  : [];
for (const key of SECTION_KEYS) {
  if (contributors.includes(key))
    problems.push(`"${key}" is a contributor and also the address of a module. Give the contributor another key.`);
  if (folders.includes(key))
    problems.push(`src/prototypes/${key}/ uses "${key}", which is the address of a module. Rename the folder.`);
}

// Imports, as written: from '...', import('...'), import '...'.
const resolveDependency = dependencyResolver(ROOT);
const runtimePolicy = scopePolicy({
  root: ROOT,
  systems: PROTOTYPE_SYSTEMS,
  defaultSystem: DEFAULT_SYSTEM,
  modules: ENABLED_MODULES,
  prototypeDirs: PROTOTYPE_DIRS,
});
const MODULES_DIR = path.join(ROOT, 'src', 'modules');
const ids = Object.keys(MODULES);

for (const file of [...sourceFiles(path.join(ROOT, 'src')), path.join(ROOT, 'vite.config.ts')]) {
  const own = path.relative(MODULES_DIR, file).split(path.sep);
  const inside = ids.includes(own[0]) ? own[0] : null;
  const rel = path.relative(ROOT, file);
  if (runtimePolicy.scopeOf(file)?.missing) continue;
  const dependencies = importsOf(fs.readFileSync(file, 'utf8'), file);
  const browserModule = inside && !/\/(?:node\/|cli\.ts$|server\.ts$|check\.ts$)/.test(rel);
  if ((runtimePolicy.scopeOf(file) || browserModule) && dependencies.some(i => i.source === null))
    problems.push(`${rel}: computed imports cannot be checked; use literal import paths.`);
  for (const { source: specifier } of dependencies) {
    const dependencyProblem = runtimePolicy.packageProblem(specifier, file);
    if (dependencyProblem) {
      problems.push(dependencyProblem);
      continue;
    }
    const resolved = resolveDependency(specifier, file);
    if (!resolved) continue;
    const platformProblem = modulePlatformProblem(
      rel.replaceAll(path.sep, '/'),
      path.relative(ROOT, resolved).replaceAll(path.sep, '/'),
    );
    if (platformProblem) problems.push(platformProblem);
    const problem = runtimePolicy.problem(specifier, file, resolved);
    if (problem) problems.push(problem);
    const target = path.relative(MODULES_DIR, resolved).split(path.sep);
    if (target[0].startsWith('..') || !ids.includes(target[0]) || target[0] === inside) continue;
    const publicEntry =
      MODULES[target[0]].lib &&
      ENABLED_MODULES.some(m => m.id === target[0]) &&
      specifier === `@module/${target[0]}` &&
      /^index\.[jt]sx?$/.test(path.relative(path.join(MODULES_DIR, target[0], 'lib'), resolved));
    const isDeclaration = target.length === 2 && /^module(\.ts)?$/.test(target[1]);
    if (inside) {
      if (MODULES[target[0]].optional)
        problems.push(
          `${rel} imports the ${target[0]} module. A module can depend only on a required module, not on one that can be turned off: ${target[0]}/ has to be removable.`,
        );
    } else if (!isDeclaration && !publicEntry && MODULES[target[0]].optional)
      problems.push(
        `${rel} imports into the ${target[0]} module ("${specifier}"). Code outside a module can read only its module.ts, or the app wouldn't run without it.`,
      );
  }
}

// File types: modules with a type.ts.
const typeIds = ids.filter(id => fs.existsSync(path.join(MODULES_DIR, id, 'type.ts')));
for (const id of typeIds) {
  const dir = path.join(MODULES_DIR, id);
  const where = path.relative(ROOT, dir);
  if (!fs.existsSync(path.join(dir, 'open.tsx')))
    problems.push(`${where}/ has a type.ts, so it is a file type, but no open.tsx saying how the app opens it.`);
  // Real import lines only: a type.ts can hold import text inside a template, like a new view's.
  for (const [, specifier] of fs
    .readFileSync(path.join(dir, 'type.ts'), 'utf8')
    .matchAll(/^import\b[^\n]*?\bfrom\s*['"]([^'"]+)['"]/gm)) {
    if (specifier !== '../../platform/core/fileTypes.ts')
      problems.push(
        `${where}/type.ts imports "${specifier}". A type.ts can import only ../../core/fileTypes.ts, because the build loads it directly in Node.`,
      );
  }
  const loader = path.join(dir, 'loader.ts');
  if (fs.existsSync(loader) && !fs.readFileSync(loader, 'utf8').includes("'/__studio_globs__/*'")) {
    problems.push(
      `${where}/loader.ts should list its files with import.meta.glob(['/__studio_globs__/*']), not a glob written out by hand: a new section and archived files would never reach it.`,
    );
  }
}

// Each module's own check (check.ts), for the modules that are on.
for (const m of specs) {
  const file = path.join(ROOT, 'src', 'modules', m.id, 'check.ts');
  if (!fs.existsSync(file) || !compatible(m) || CONFIG.modules?.[m.id] === false) continue;
  try {
    const run = (await import(pathToFileURL(file).href)).default;
    for (const problem of await run({ root: ROOT })) problems.push(`${m.id}: ${problem}`);
  } catch (e) {
    problems.push(`${m.id}: its check.ts failed to run (${e.message}).`);
  }
}

// What you changed in a module or design system you added from a source (studio.lock.json). Yours to change: this says where.
for (const c of changesFromLock()) {
  const parts = [
    c.changed.length &&
      `${c.changed.length} file(s) changed from the original (${c.changed[0]}${c.changed.length > 1 ? ', ...' : ''})`,
    c.missing.length && `${c.missing.length} file(s) deleted`,
  ].filter(Boolean);
  console.log(`[modules] The ${c.kind} ${c.id} has ${parts.join(' and ')}.`);
}

// A module that needs a newer platform is turned off, not broken: say so, and carry on.
for (const m of specs) {
  if (!compatible(m))
    console.log(
      `[modules] The ${m.id} module needs platform ${m.requires} or newer, and this is ${PLATFORM_VERSION}, so it is off. Update the platform to use it.`,
    );
}

// Ownership map coverage is a warning for now: it never fails the check.
try {
  printOwnership(ownershipReport(ROOT));
} catch (e) {
  console.log(`[ownership] warning: the ownership map could not be checked (${e.message}).`);
}

if (problems.length) {
  console.error(problems.map(p => `[modules] ${p}`).join('\n'));
  process.exit(1);
}
console.log(
  `[modules] ${specs.length} module(s) (${Object.keys(MODULES).join(', ')}), ${typeIds.length} of them file types, and ${SYSTEM_IDS.length} design system(s) (${SYSTEM_IDS.join(', ')}), all well formed`,
);
