import { allocateResourceIdentity, retainedResourceIds } from '../lib/resource-identity-lifecycle.js';
import { INSTALLED_FILE_TYPES } from '../lib/file-types.js';
import { planSystemLifecycle, applySystemLifecycle } from '../lib/system-lifecycle.js';
import { prototypeContext } from '../lib/prototype-context.js';
import { resourceId } from '../../core/resourceIdentity.ts';
import { moduleConsumers } from '../lib/imports.js';
import { systemPackage, systemDependencyProblems } from '../lib/system-dependencies.js';
// pnpm studio <command>: add, remove, turn on or off, and make modules and design systems. For your agent: designers
// ask in plain words and the agent runs these. Every command that changes files says what it will do first, and
// changes nothing until it is run again with --yes.
//
//   list                              what is installed, and what is on
//   enable <module> / disable <module>   turn an optional module on or off in studio.config.ts (its files stay)
//   add <source> [--path <dir>] [--id <name>] [--yes] [--allow-license]
//                                     add a module or design system from a folder, a git address (https or ssh,
//                                     with an optional #branch, tag or commit), or an https .tar.gz
//   remove <module|system> [--content] [--yes] [--force]
//                                     delete a module (its prototypes' content is kept unless --content) or a system
//   create-module <id> [--label <name>] [--out <folder>]
//   create-system <id> [--label <name>] [--out <folder>]
//                                     start a new one; with --out, as a pack in that folder to publish
//   sync [--check]                    synchronize routing and project skills; --check never writes
//   context <prototype-folder> [--json] inspect assignment, rebuild target, scope, and guidance paths; never writes
//   identity-audit [--json]             inspect existing/missing IDs, including retained types; never writes
//   identity-plan [--out <file>] [--json] preview IDs, relationships and stored links; no source is changed
//   identity-apply <preview> [--yes]     apply the reviewed migration with existing Admin authority
//   identify <prototype-folder> [--yes] assign missing IDs within one owned prototype
//   check                             pnpm check, and what has changed from the original of a module you added
// Dry runs read declarations as data. --yes trusts the source: its checks run after packages install.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { knowledgeOwners, skillCatalog, syncSkillAdapters } from '../lib/agent-skills.js';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compatible, listProblems, moduleProblems, PLATFORM_VERSION } from '../../core/modules/index.ts';
import {
  agentsBlock,
  applyAgentsBlock,
  editModulesFlag,
  licenseVerdict,
  packPlan,
  parseSource,
  readDeclaration,
} from '../../core/modules/pack.ts';
import { systemProblems } from '../../../modules/systems/spec.ts';
import { MODULES, ENABLED_MODULES, CONFIG } from '../lib/modules.js';
import {
  PLATFORM_ID,
  SYSTEM_SPECS,
  PROTOTYPE_SYSTEMS,
  DEFAULT_SYSTEM,
  SYSTEM_IDS,
} from '../../../modules/systems/node/systems.js';
import { canPerform, studioRole } from '../../core/permissions.ts';
import { configProblems } from '../../core/config.ts';
import { applySetupChanges, editStudioConfig } from '../lib/studio-setup.js';
import { planSettings } from '../lib/studio-settings.js';
import { resolveContributor } from './resolve-contributor.js';
import { fetchSource, walk } from '../lib/fetch-source.js';
import { loadContributors } from '../lib/contributors.js';
import { changesFromLock, hashFile, readLock, writeLock } from '../lib/lock.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const rel = (...parts) => path.join(ROOT, ...parts);
const say = (line = '') => console.log(line);
const fail = message => {
  console.error(message);
  process.exit(1);
};
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

// ---- arguments
const [command, ...rest] = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a === '--') continue;
  if (
    [
      '--yes',
      '--content',
      '--force',
      '--allow-license',
      '--json',
      '--check',
      '--restore-prototypes',
      '--recovery',
    ].includes(a)
  )
    flags[a.slice(2)] = true;
  else if (
    [
      '--path',
      '--id',
      '--label',
      '--out',
      '--name',
      '--tagline',
      '--usage',
      '--system',
      '--admins',
      '--maintainers',
    ].includes(a)
  ) {
    flags[a.slice(2)] = rest[++i];
    if (flags[a.slice(2)] === undefined) fail(`${a} needs a value.`);
  } else if (a.startsWith('--')) fail(`Unknown option ${a}.`);
  else positional.push(a);
}
const ID = /^[a-z][a-z0-9-]*$/;
if (flags.check && command !== 'sync') fail('--check is supported only with sync.');
const titleOf = id =>
  id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
const slug = text =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, '');

// ---- places that must never be deleted, whatever a pack or a flag says
const PROTECTED = new Set([
  'src',
  'src/platform',
  'src/modules',
  'src/prototypes',
  'src/lib',
  `src/systems/${PLATFORM_ID}`,
  `src/systems/${PLATFORM_ID}/context`,
  `src/systems/${PLATFORM_ID}/skills`,
  'src/systems',
  'src/types',
]);
function removable(relative) {
  const clean = path.posix.normalize(relative.replace(/\/$/, ''));
  if (!relative || clean.startsWith('..') || clean.startsWith('/') || !clean.startsWith('src/') || PROTECTED.has(clean))
    throw new Error(`Refusing to delete ${relative}.`);
  const abs = rel(clean);
  if (!abs.startsWith(rel('src') + path.sep)) throw new Error(`Refusing to delete ${relative}.`);
  return abs;
}
function removeEmptyParents(abs) {
  for (
    let dir = path.dirname(abs);
    dir.startsWith(rel('src') + path.sep) && !PROTECTED.has(path.relative(ROOT, dir));
    dir = path.dirname(dir)
  ) {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    else break;
  }
}

// ---- AGENTS.md
function syncAgents() {
  const file = rel('AGENTS.md');
  if (!fs.existsSync(file)) {
    if (flags.check) throw new Error('AGENTS.md is missing. Restore project instructions before checking routing.');
    return false;
  }
  const text = fs.readFileSync(file, 'utf8');
  const next = applyAgentsBlock(text, agentsBlock(ENABLED_MODULES, PLATFORM_ID));
  if (next === text) return false;
  if (flags.check) throw new Error('AGENTS.md module routing is stale. Run pnpm studio sync.');
  fs.writeFileSync(file, next);
  return true;
}
const syncSkills = () => {
  const result = syncSkillAdapters(ROOT, skillCatalog(ROOT, knowledgeOwners(ENABLED_MODULES, SYSTEM_SPECS)), {
    check: Boolean(flags.check),
  });
  for (const warning of result.warnings) say(warning);
  if (flags.check && (result.changed || result.warnings.length))
    throw new Error('Project skill adapters need review or synchronization. Run pnpm studio sync.');
  say(`Project skills synchronized (Codex, Cursor, Claude Code; ${result.changed} changes).`);
};
const syncInFreshProcess = () => run('node', ['src/platform/node/cli/studio.js', 'sync']);
const checkInFreshProcess = () => {
  try {
    run('node', ['src/platform/node/check/check-modules.js']);
    return null;
  } catch (e) {
    return `${e.stderr ?? ''}${e.stdout ?? ''}`.trim();
  }
};

// ---- commands
function list() {
  const lock = readLock();
  say('Modules');
  for (const [id, m] of Object.entries(MODULES)) {
    if (!m || typeof m !== 'object') continue;
    const state =
      CONFIG.modules?.[id] !== true
        ? CONFIG.modules?.[id] === false
          ? 'off'
          : 'unregistered'
        : !compatible(m)
          ? `off (needs platform ${m.requires})`
          : 'on';
    const where = lock.modules[id] ? `added from ${lock.modules[id].source}` : 'came with the kit';
    say(`  ${id.padEnd(12)} ${state.padEnd(8)} ${m.optional ? 'can be turned off' : 'required         '}  ${where}`);
    if (m.description) say(`               ${m.description}`);
  }
  say();
  say('Systems');
  for (const id of CONFIG.systems ?? []) {
    const where = lock.systems[id] ? `added from ${lock.systems[id].source}` : 'came with the kit';
    say(`  ${id.padEnd(12)} ${id === DEFAULT_SYSTEM ? 'default ' : '        '} ${where}`);
  }
}

function setEnabled(id, on) {
  const spec = MODULES[id];
  if (!id || !spec) fail(`No module has the id "${id ?? ''}". Installed: ${Object.keys(MODULES).join(', ')}.`);
  if (!on && !spec.optional) fail(`The ${id} module can't be turned off yet; other parts of the app still use it.`);
  if (on && !compatible(spec))
    fail(`The ${id} module needs platform ${spec.requires} or newer, and this is ${PLATFORM_VERSION}.`);
  const plan = planSettings({
    root: ROOT,
    modules: Object.values(MODULES),
    systems: SYSTEM_IDS,
    platformId: PLATFORM_ID,
    contributors: loadContributors(),
    changes: { modules: { [id]: on } },
  });
  applySetupChanges(plan.edits);
  syncInFreshProcess();
  say(
    `${spec.label} is ${on ? 'on' : 'off'}. ${on ? '' : 'Its files are still there; turn it on again any time. '}Restart the dev server for it to take effect.`,
  );
}

// Installation and registration are one operation. Rollback restores both.
function registerCapability(kind, id, present, remember = () => {}) {
  const file = rel('studio.config.ts');
  const text = fs.readFileSync(file, 'utf8');
  let next;
  if (kind === 'module') next = editModulesFlag(text, id, present ? true : null);
  else {
    const declaration = readDeclaration(text);
    if ('error' in declaration || !Array.isArray(declaration.value.systems))
      throw new Error('Declare systems as an explicit array in studio.config.ts.');
    const systems = declaration.value.systems.filter(value => value !== id);
    if (present) systems.push(id);
    const systemMaintainers = { ...declaration.value.systemMaintainers };
    const spec = present
      ? readDeclaration(fs.readFileSync(rel('src/systems', id, 'system.ts'), 'utf8'))
      : { value: SYSTEM_SPECS[id] };
    if ('error' in spec) throw new Error(spec.error);
    const permanentId = resourceId(spec.value.studioId);
    if (present) systemMaintainers[permanentId] = [];
    else delete systemMaintainers[permanentId];
    next = editStudioConfig(text, { systems, systemMaintainers });
  }
  if (next === null) throw new Error('Declare modules as explicit true/false entries in studio.config.ts.');
  remember(file);
  fs.writeFileSync(file, next);
}

async function add() {
  if (positional.length !== 1) fail('Usage: pnpm studio add <source> [--path <folder>] [--id <name>] [--yes]');
  const source = parseSource(positional[0]);
  if ('error' in source) fail(source.error);
  say(`Getting ${positional[0]} ...`);
  let pack;
  try {
    pack = await fetchSource(source, flags.path);
  } catch (e) {
    fail(e.message);
  }
  const created = []; // files this run wrote
  let createdSystem;
  const backups = new Map(); // text of files to put back if it goes wrong
  const remember = file => {
    if (!backups.has(file)) backups.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null);
  };
  try {
    const files = walk(pack.dir);
    const names = files.map(f => f.rel);
    const hasModule = names.includes('module.ts'),
      hasSystem = names.includes('system.ts');
    if (hasModule === hasSystem)
      fail(
        hasModule
          ? 'That has both a module.ts and a system.ts. A pack is one or the other.'
          : "That isn't a module or a design system: it has no module.ts or system.ts at its top.",
      );
    const kind = hasModule ? 'module' : 'system';
    const declared = readDeclaration(
      fs.readFileSync(path.join(pack.dir, hasModule ? 'module.ts' : 'system.ts'), 'utf8'),
    );
    if ('error' in declared) fail(`${hasModule ? 'module.ts' : 'system.ts'}: ${declared.error}`);
    const spec = declared.value;
    const id = kind === 'module' ? spec.id : (flags.id ?? slug(spec.label ?? ''));
    if (typeof id !== 'string' || !ID.test(id))
      fail(
        kind === 'module'
          ? 'module.ts needs an id: lowercase letters, numbers, and dashes.'
          : 'Give the system an id with --id <name>: lowercase letters, numbers, and dashes.',
      );
    const problems = kind === 'module' ? moduleProblems(spec, id) : systemProblems(spec, id);
    if (kind === 'system') problems.push(...systemDependencyProblems(ROOT, { [id]: { ...spec, dir: pack.dir } }));
    if (kind === 'module' && !compatible(spec))
      problems.push(
        `It needs platform ${spec.requires} or newer, and this is ${PLATFORM_VERSION}. Update the platform first.`,
      );
    const installed =
      kind === 'module' ? fs.existsSync(rel('src', 'modules', id)) : fs.existsSync(rel('src', 'systems', id));
    if (installed)
      problems.push(
        `There's already a ${kind === 'module' ? 'module' : 'design system'} called "${id}". Remove it first (pnpm studio remove ${id}), or add this one with another id.`,
      );
    if (kind === 'module')
      problems.push(
        ...listProblems([...Object.values(MODULES).filter(m => m && typeof m === 'object'), spec]).filter(
          p => p.includes(`"${spec.section?.key}"`) || p.includes(` ${id} `),
        ),
      );
    if (kind === 'system' && spec.role === 'platform')
      problems.push(
        'The application already has a required Studio system. Added systems must declare role: prototype.',
      );
    const plan = packPlan(kind, id, spec, names, PLATFORM_ID);
    problems.push(...plan.problems);
    const licenseFile = names.some(n => /^licen[sc]e(\.[a-z]+)?$/i.test(n));
    const verdict = licenseVerdict(spec, licenseFile);
    if (verdict === 'none')
      problems.push(
        `It says it is built on ${spec.upstream?.repo}, but has ${licenseFile ? 'no usable license' : 'no LICENSE file'}. Without the library's license you can't use it.`,
      );
    if (verdict === 'not-permissive' && !flags['allow-license'])
      problems.push(
        `Its library is under ${spec.upstream.license}, which isn't one of the permissive licenses (MIT, Apache-2.0, BSD, ISC, and similar). If your company says it's fine, add --allow-license.`,
      );
    const taken = plan.moves.filter(m => fs.existsSync(rel(m.to)) && !m.to.startsWith(`${spec.section?.folder}/`));
    for (const m of taken) problems.push(`${m.to} already exists, and a module never overwrites a file.`);
    const deps = Object.entries(
      kind === 'system' ? (systemPackage(pack.dir).dependencies ?? {}) : (spec.dependencies ?? {}),
    );
    const pkg = JSON.parse(fs.readFileSync(rel('package.json'), 'utf8'));
    const needed = deps.filter(
      ([name]) => !(name in (pkg.dependencies ?? {})) && !(name in (pkg.devDependencies ?? {})),
    );

    // The review.
    say();
    say(
      `${kind === 'module' ? 'Module' : 'Design system'}: ${spec.label} (${id})${spec.version ? ` ${spec.version}` : ''}`,
    );
    if (spec.description) say(spec.description);
    say(`From: ${pack.origin.source}${pack.origin.ref ? ` at ${pack.origin.ref.slice(0, 12)}` : ''}`);
    if (spec.upstream)
      say(
        `Built on ${spec.upstream.repo} ${spec.upstream.version}, ${spec.upstream.license}${verdict === 'ok' ? ' (permissive)' : ''}`,
      );
    say();
    say(`It would add ${plan.moves.length} file(s):`);
    const dirs = new Map();
    for (const m of plan.moves) {
      const d = path.posix.dirname(m.to);
      dirs.set(d, (dirs.get(d) ?? 0) + 1);
    }
    for (const [d, n] of dirs) say(`  ${d}/   ${n} file(s)`);
    if (kind === 'module') {
      const provides = [];
      if (spec.section)
        provides.push(
          `a page at /${spec.section.key}${spec.section.items ? ` (items in ${spec.section.folder})` : ''}`,
        );
      if (names.includes('app.tsx')) provides.push('a rail button and routes');
      if (names.includes('server.ts')) provides.push('routes on the dev server');
      if (spec.lib) provides.push(`a library prototypes import as @module/${id}`);
      if (names.includes('check.ts')) provides.push('a check in pnpm check');
      if (spec.instructions?.length)
        provides.push(`${spec.instructions.length} platform instruction file(s) for agents`);
      say(`It provides: ${provides.join('; ') || 'nothing yet'}.`);
      say(`${spec.optional ? 'It can be turned off in studio.config.ts.' : 'It cannot be turned off.'}`);
    }
    if (deps.length)
      say(
        `It needs npm packages: ${deps.map(([n, v]) => `${n}@${v}${needed.some(([x]) => x === n) ? '' : ' (already installed)'}`).join(', ')}. ${needed.length ? 'They are installed only if you say yes, with install scripts off.' : ''}`,
      );
    if (plan.skipped.length) say(`Left behind: ${plan.skipped.length} hidden or dependency file(s).`);
    say(`Registration: studio.config.ts ${kind === 'module' ? `modules.${id}: true` : `systems includes ${id}`}.`);
    say('Everything it adds is code that will run in your app and your dev server, so read it before you say yes.');
    if (names.includes('check.ts'))
      say('With --yes, its check.ts runs on your computer during installation, after its packages are installed.');
    if (problems.length) {
      say();
      for (const p of problems) console.error(`Can't add it: ${p}`);
      process.exit(1);
    }
    if (!flags.yes) {
      say();
      say(`Nothing was changed. To add it, run the same command with --yes.`);
      return;
    }

    // The package ID describes its source; this ID identifies this installation.
    const installationId =
      kind === 'system' ? allocateResourceIdentity(retainedResourceIds(ROOT, INSTALLED_FILE_TYPES)) : undefined;
    if (kind === 'system') createdSystem = rel('src/systems', id);
    // Add it.
    for (const m of plan.moves) {
      const to = rel(m.to);
      if (fs.existsSync(to)) continue; // content that was already there stays
      fs.mkdirSync(path.dirname(to), { recursive: true });
      if (kind === 'system' && m.from === 'system.ts')
        fs.writeFileSync(
          to,
          editStudioConfig(fs.readFileSync(path.join(pack.dir, m.from), 'utf8'), { studioId: installationId }),
        );
      else if (kind === 'system' && m.from === 'package.json')
        fs.writeFileSync(
          to,
          JSON.stringify({ ...systemPackage(pack.dir), name: `@studio-system/${installationId}` }, null, 2) + '\n',
        );
      else fs.copyFileSync(path.join(pack.dir, m.from), to);
      created.push(to);
    }
    const lock = readLock();
    remember(rel('studio.lock.json'));
    remember(rel('AGENTS.md'));
    remember(rel('package.json'));
    remember(rel('pnpm-lock.yaml'));
    const entry = {
      kind,
      version: spec.version ?? null,
      source: pack.origin.source,
      ...(pack.origin.ref && { ref: pack.origin.ref }),
      ...(spec.upstream && { upstream: spec.upstream }),
      files: Object.fromEntries(
        plan.moves.filter(m => created.includes(rel(m.to))).map(m => [m.to, hashFile(rel(m.to))]),
      ),
    };
    lock[kind === 'module' ? 'modules' : 'systems'][id] = entry;
    writeLock(lock);
    if (kind === 'system') {
      say('Installing this system’s workspace dependencies ...');
      run('pnpm', ['install', '--ignore-scripts', '--no-frozen-lockfile']);
    } else if (needed.length) {
      say(`Installing ${needed.map(([n]) => n).join(', ')} ...`);
      run('pnpm', ['add', '--workspace-root', '--ignore-scripts', ...needed.map(([n, v]) => `${n}@${v}`)]);
    }
    registerCapability(kind, id, true, remember);
    const problem = checkInFreshProcess();
    if (problem) throw new Error(`It didn't pass the checks:\n${problem}`);
    syncInFreshProcess();
    say(`Added ${spec.label}. Restart the dev server to see it.`);
  } catch (e) {
    for (const file of created.reverse()) {
      fs.rmSync(file, { force: true });
      removeEmptyParents(file);
    }
    // Failed workspace installation can leave dependency links in a newly created system.
    if (createdSystem) fs.rmSync(createdSystem, { recursive: true, force: true });
    for (const [file, content] of backups) {
      if (content === null) fs.rmSync(file, { force: true });
      else fs.writeFileSync(file, content);
    }
    console.error(`Nothing was added. ${e.message}`);
    process.exitCode = 1;
  } finally {
    pack.cleanup();
  }
}

function lifecycle(action) {
  if (
    flags.yes &&
    !canPerform(
      CONFIG,
      resolveContributor(),
      Object.keys(loadContributors()),
      {
        kind: 'system',
        id: positional[0],
        role: SYSTEM_SPECS[positional[0]]?.role,
        status: SYSTEM_SPECS[positional[0]]?.status,
      },
      action === 'rename' ? 'rename' : 'manage',
    )
  )
    fail('This system operation requires an Admin or, for rename, an assigned system maintainer.');
  const plan = planSystemLifecycle(ROOT, CONFIG, action, positional[0], {
    name: flags.label,
    restorePrototypes: Boolean(flags['restore-prototypes']),
  });
  say(
    `${action} system ${positional[0]}${plan.id !== positional[0] ? ` → ${plan.id}` : ''}. ${plan.prototypes} associated prototype(s); ${plan.edits.length} file update(s).`,
  );
  if (action === 'delete')
    say(
      'Permanently deletes the system source. Associated prototypes retain their code and require a system rebuild before rendering or deployment.',
    );
  if (action === 'archive')
    say(
      'Retains source; archives associated active prototypes and excludes the system from deployment and new selections.',
    );
  if (!flags.yes) {
    say('Preview only. Apply with --yes.');
    return;
  }
  const marker = rel('.studio-system-operation');
  const markerFd = fs.openSync(marker, 'wx');
  fs.closeSync(markerFd);
  const lockBefore = fs.existsSync(rel('studio.lock.json')) ? fs.readFileSync(rel('studio.lock.json'), 'utf8') : null;
  const packageLockBefore = fs.readFileSync(rel('pnpm-lock.yaml'));
  try {
    const result = applySystemLifecycle(plan, () => {
      const lock = readLock();
      const entry = lock.systems[positional[0]];
      if (entry && action === 'rename' && plan.id !== positional[0]) {
        delete lock.systems[positional[0]];
        lock.systems[plan.id] = {
          ...entry,
          files: Object.fromEntries(
            Object.entries(entry.files ?? {}).map(([file, hash]) => [
              file.replace(`src/systems/${positional[0]}/`, `src/systems/${plan.id}/`),
              hash,
            ]),
          ),
        };
      }
      if (action === 'delete') delete lock.systems[positional[0]];
      writeLock(lock);
      if (plan.move || plan.remove)
        run('pnpm', ['install', '--lockfile-only', '--ignore-scripts', '--prefer-offline', '--no-frozen-lockfile']);
      const problem = checkInFreshProcess();
      if (problem) throw new Error(problem);
      syncInFreshProcess();
    });
    say(JSON.stringify(result));
  } catch (error) {
    fs.writeFileSync(rel('pnpm-lock.yaml'), packageLockBefore);
    if (lockBefore === null) fs.rmSync(rel('studio.lock.json'), { force: true });
    else fs.writeFileSync(rel('studio.lock.json'), lockBefore);
    throw error;
  } finally {
    fs.rmSync(marker, { force: true });
  }
}

function remove() {
  const [id] = positional;
  if (!id) fail('Usage: pnpm studio remove <module|system> [--content] [--yes] [--force]');
  const isModule = Object.hasOwn(MODULES, id) && MODULES[id];
  if (!isModule && SYSTEM_SPECS[id]?.role === 'platform')
    fail('The Studio system serves the platform and cannot be removed.');
  const isSystem = !isModule && Object.hasOwn(PROTOTYPE_SYSTEMS, id);
  if (!isModule && !isSystem)
    fail(
      `Nothing is called "${id}". Modules: ${Object.keys(MODULES).join(', ')}. Design systems: ${SYSTEM_IDS.join(', ')}.`,
    );
  const paths = [];
  const notes = [];
  if (isModule) {
    const spec = MODULES[id];
    if (id === 'contributors' && CONFIG.usage === 'team')
      fail('Team use requires Contributors & Permissions. Switch to personal use before removing it.');
    if (!spec.optional) fail(`The ${id} module can't be removed yet; other parts of the app still use it.`);
    paths.push(`src/modules/${id}`);

    if (spec.section?.folder && !spec.section.folder.startsWith(`src/modules/${id}`)) {
      if (flags.content) paths.push(spec.section.folder);
      else if (fs.existsSync(rel(spec.section.folder)))
        notes.push(`Its content in ${spec.section.folder} stays. Add --content to delete that too.`);
    }
    const users = moduleConsumers(ROOT, id);
    if (users.length && !flags.force)
      fail(
        `${users.length} file(s) depend on ${id}, like ${users[0]}, and would stop working. Change them first, or add --force.`,
      );
    if (Object.keys(spec.dependencies ?? {}).length)
      notes.push(
        `Its npm packages stay installed: ${Object.keys(spec.dependencies).join(', ')}. Remove them with pnpm remove if nothing else uses them.`,
      );
  } else {
    paths.push(`src/systems/${id}`);
    if (SYSTEM_IDS.length === 1) fail(`${id} is the only design system, and prototypes need one. Add another first.`);
    if (id === DEFAULT_SYSTEM)
      fail(`${id} is the default design system. Set defaultSystem in studio.config.ts to another one first.`);
    const users = [];
    const protoRoot = rel('src', 'prototypes');
    for (const who of fs.existsSync(protoRoot)
      ? fs.readdirSync(protoRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())
      : []) {
      for (const proto of fs
        .readdirSync(path.join(protoRoot, who.name), { withFileTypes: true })
        .filter(entry => entry.isDirectory())) {
        try {
          const meta = JSON.parse(fs.readFileSync(path.join(protoRoot, who.name, proto.name, 'meta.json'), 'utf8'));
          if (meta.systemId === SYSTEM_SPECS[id].studioId || meta.rebuild?.targetSystemId === SYSTEM_SPECS[id].studioId)
            users.push(`${who.name}/${proto.name}`);
        } catch {
          /* not a prototype */
        }
      }
    }
    for (const module of Object.values(MODULES)) {
      if (module?.section?.items !== 'prototypes' || module.section.byPerson || !module.section.folder) continue;
      const folder = rel(module.section.folder);
      for (const item of fs.existsSync(folder)
        ? fs.readdirSync(folder, { withFileTypes: true }).filter(entry => entry.isDirectory())
        : []) {
        try {
          const meta = JSON.parse(fs.readFileSync(path.join(folder, item.name, 'meta.json'), 'utf8'));
          if (meta.systemId === SYSTEM_SPECS[id].studioId || meta.rebuild?.targetSystemId === SYSTEM_SPECS[id].studioId)
            users.push(`${module.section.key}/${item.name}`);
        } catch {
          /* not an item */
        }
      }
    }
    const references = [];
    const scan = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.name.startsWith('.') || file === rel('src/systems/' + id)) continue;
        if (entry.isDirectory()) scan(file);
        else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name === 'AGENTS.md')) {
          const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
          if (
            [...text.matchAll(/\]\(([^)\s]+)\)/g)].some(m => {
              const href = m[1].split('#')[0];
              if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
              const target = href.startsWith('/') ? rel('src' + href) : path.resolve(path.dirname(file), href);
              const root = rel('src/systems/' + id);
              return target === root || target.startsWith(root + path.sep);
            })
          )
            references.push(path.relative(ROOT, file));
        }
      }
    };
    scan(rel('src'));
    const rootInstructions = fs.readFileSync(rel('AGENTS.md'), 'utf8');
    if (rootInstructions.includes('src/systems/' + id + '/')) references.push('AGENTS.md');
    if (references.length && !flags.force)
      fail(
        references.length +
          ' file(s) reference ' +
          id +
          ', like ' +
          references[0] +
          '. Update their links before removing this system.',
      );
    if (users.length && !flags.force)
      fail(`${users.length} prototype(s) use ${id}, like ${users[0]}. Change their "system" first, or add --force.`);
  }
  const abs = paths.map(p => removable(p)).filter(a => fs.existsSync(a));
  say(`This would delete:`);
  for (const a of abs) say(`  ${path.relative(ROOT, a)}`);
  for (const n of notes) say(n);
  if (!flags.yes) {
    say();
    say('Nothing was changed. To remove it, run the same command with --yes.');
    return;
  }
  for (const a of abs) {
    fs.rmSync(a, { recursive: true, force: true });
    removeEmptyParents(a);
  }
  const lock = readLock();
  delete lock[isModule ? 'modules' : 'systems'][id];
  writeLock(lock);
  registerCapability(isModule ? 'module' : 'system', id, false);
  if (!isModule)
    run('pnpm', ['install', '--lockfile-only', '--ignore-scripts', '--prefer-offline', '--no-frozen-lockfile']);
  syncInFreshProcess();
  say(`Removed ${id}. Restart the dev server.`);
}

function create(kind) {
  const [id] = positional;
  if (!id || !ID.test(id))
    fail(
      `Usage: pnpm studio create-${kind} <id> [--label <name>] [--out <folder>]. The id is lowercase letters, numbers, and dashes.`,
    );
  const label = flags.label ?? titleOf(id);
  if (/[\n\r<>`$\\]/.test(label)) fail('The label should be plain text.');
  const template = rel('src', 'platform', 'node', 'templates', kind);
  const fill = text => text.replaceAll('__ID__', id).replaceAll('__LABEL__', label);
  const templateFiles = walk(template).map(f => f.rel);
  const sourceOf = new Map(templateFiles.map(f => [fill(f), f])); // a file's name has the id in it too
  const files = templateFiles.map(fill);
  if (flags.out) {
    // A pack in its own folder, to publish.
    const out = path.resolve(flags.out);
    if (fs.existsSync(out) && fs.readdirSync(out).length) fail(`${out} isn't empty.`);
    for (const file of files) say(`Create ${path.join(out, file)}`);
    if (!flags.yes) {
      say('Nothing written. Apply this scaffold with --yes.');
      return;
    }
    for (const f of files) {
      const to = path.join(out, f);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.writeFileSync(to, fill(fs.readFileSync(path.join(template, sourceOf.get(f)), 'utf8')));
    }
    say(
      `Made the ${kind} in ${out}. Publish it as a git repository, then anyone can run: pnpm studio add <its address>`,
    );
    return;
  }
  const spec = readDeclaration(
    fill(fs.readFileSync(path.join(template, kind === 'module' ? 'module.ts' : 'system.ts'), 'utf8')),
  ).value;
  if (kind === 'module' ? fs.existsSync(rel('src', 'modules', id)) : fs.existsSync(rel('src', 'systems', id)))
    fail(`There's already a ${kind} called "${id}".`);
  if (kind === 'module' && SECTION_TAKEN(id))
    fail(`"${id}" is already the address of another module, or a contributor's folder. Choose another id.`);
  const plan = packPlan(kind, id, spec, files, PLATFORM_ID);
  if (plan.problems.length) fail(plan.problems.join('\n'));
  for (const move of plan.moves) {
    if (fs.existsSync(rel(move.to))) fail(`${move.to} already exists.`);
    say(`Create ${move.to}`);
  }
  say(`Register ${kind} ${id} in studio.config.ts and synchronize agent routing.`);
  if (!flags.yes) {
    say('Nothing written. Apply this scaffold with --yes.');
    return;
  }
  const installationId =
    kind === 'system' ? allocateResourceIdentity(retainedResourceIds(ROOT, INSTALLED_FILE_TYPES)) : undefined;
  const written = [];
  const backups = new Map();
  if (kind === 'system') backups.set(rel('pnpm-lock.yaml'), fs.readFileSync(rel('pnpm-lock.yaml')));
  try {
    for (const m of plan.moves) {
      const to = rel(m.to);
      if (fs.existsSync(to)) throw new Error(`${m.to} already exists.`);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      const content = fill(fs.readFileSync(path.join(template, sourceOf.get(m.from)), 'utf8'));
      let source = content;
      if (kind === 'system' && sourceOf.get(m.from) === 'system.ts')
        source = editStudioConfig(content, { studioId: installationId });
      if (kind === 'system' && sourceOf.get(m.from) === 'package.json') {
        const host = JSON.parse(fs.readFileSync(rel('package.json'), 'utf8'));
        source =
          JSON.stringify(
            {
              ...JSON.parse(content),
              name: `@studio-system/${installationId}`,
              peerDependencies: Object.fromEntries(['react', 'react-dom'].map(name => [name, host.dependencies[name]])),
            },
            null,
            2,
          ) + '\n';
      }
      fs.writeFileSync(to, source);
      written.push(to);
    }
    registerCapability(kind, id, true, file => backups.set(file, fs.readFileSync(file)));
    if (kind === 'system')
      run('pnpm', ['install', '--lockfile-only', '--ignore-scripts', '--prefer-offline', '--no-frozen-lockfile']);
    const problem = checkInFreshProcess();
    if (problem) throw new Error(problem);
  } catch (e) {
    for (const f of written.reverse()) {
      fs.rmSync(f, { force: true });
      removeEmptyParents(f);
    }
    for (const [file, content] of backups) fs.writeFileSync(file, content);
    fail(`Nothing was made. ${e.message}`);
  }
  syncInFreshProcess();
  say(
    `Made the ${kind} "${id}" in ${kind === 'module' ? `src/modules/${id}/` : `src/systems/${id}/`}. Restart the dev server to see it.`,
  );
}

function SECTION_TAKEN(id) {
  const keys = new Set(Object.values(MODULES).flatMap(m => (m?.section ? [m.section.key] : [])));
  const contributors = Object.keys(loadContributors());
  const folders = fs.existsSync(rel('src', 'prototypes')) ? fs.readdirSync(rel('src', 'prototypes')) : [];
  return keys.has(id) || contributors.includes(id) || folders.includes(id);
}

function check() {
  const problem = checkInFreshProcess();
  say(problem ?? run('node', ['src/platform/node/check/check-modules.js']).trim());
  const changes = changesFromLock();
  for (const c of changes) {
    say(
      `${c.kind} ${c.id}: ${c.changed.length ? `${c.changed.length} file(s) changed from the original (${c.changed[0]}${c.changed.length > 1 ? ', ...' : ''})` : ''}${c.changed.length && c.missing.length ? '; ' : ''}${c.missing.length ? `${c.missing.length} file(s) deleted` : ''}. That's yours to change; this just says where it differs.`,
    );
  }
  if (problem) process.exit(1);
}

function configure() {
  const changes = Object.fromEntries(
    ['name', 'tagline', 'usage'].filter(key => flags[key] !== undefined).map(key => [key, flags[key]]),
  );
  if (flags.system !== undefined) changes.defaultSystem = flags.system;
  if (flags.maintainers !== undefined) {
    const [id, members] = flags.maintainers.split('=');
    if (!id || members === undefined) fail('Use --maintainers system=key,key, or system= to clear assignments.');
    changes.systemMaintainers = {
      ...CONFIG.systemMaintainers,
      [id]: members
        .split(',')
        .map(key => key.trim())
        .filter(Boolean),
    };
  }
  if (flags.admins !== undefined)
    changes.admins = flags.admins
      .split(',')
      .map(key => key.trim())
      .filter(Boolean);
  if (!Object.keys(changes).length)
    fail(
      'Usage: pnpm studio configure --name "My Studio" --usage personal|team --system <id> [--tagline "..."] [--admins key,key] [--maintainers system=key,key] [--recovery] [--yes]',
    );
  const plan = planSettings({
    root: ROOT,
    modules: Object.values(MODULES),
    systems: SYSTEM_IDS,
    platformId: PLATFORM_ID,
    contributors: loadContributors(),
    changes,
  });
  say(JSON.stringify(changes, null, 2));
  for (const pin of plan.pins) say(`Keep ${path.relative(ROOT, pin.file)} on ${DEFAULT_SYSTEM}.`);
  if (!flags.yes) {
    say('Nothing written. Apply these choices with --yes.');
    return;
  }
  applySetupChanges(plan.edits);
  syncInFreshProcess();
  say('Updated studio.config.ts. Restart the dev server.');
}

function status() {
  const systemContent = ['principles', 'personas'].map(name => `src/systems/${DEFAULT_SYSTEM}/context/${name}.md`);
  const report = {
    config: { name: CONFIG.name, usage: CONFIG.usage, defaultSystem: DEFAULT_SYSTEM },
    contributor: resolveContributor(),
    modules: {
      enabled: ENABLED_MODULES.map(module => module.id),
      disabled: Object.keys(MODULES).filter(id => !ENABLED_MODULES.some(module => module.id === id)),
    },
    systems: CONFIG.systems,
    systemContentPlaceholders: systemContent.filter(
      file => fs.existsSync(rel(file)) && fs.readFileSync(rel(file), 'utf8').includes('**Placeholder.**'),
    ),
    problems: configProblems(CONFIG, Object.values(MODULES), SYSTEM_IDS, PLATFORM_ID, Object.keys(loadContributors())),
  };
  if (flags.json) say(JSON.stringify(report, null, 2));
  else {
    say(`${report.config.name} (${report.config.usage})`);
    say(`Contributor: ${report.contributor ?? 'not registered'}. Default system: ${DEFAULT_SYSTEM}.`);
    say(`Enabled: ${report.modules.enabled.join(', ')}. Disabled: ${report.modules.disabled.join(', ') || 'none'}.`);
    for (const file of report.systemContentPlaceholders) say(`Team context still has starter examples: ${file}`);
    for (const problem of report.problems) say(problem);
    say('This reports current files, not setup completion. Verify with pnpm build and a first prototype.');
  }
}

function context() {
  if (positional.length !== 1) fail('Usage: pnpm studio context src/prototypes/<contributor>/<prototype> [--json]');
  try {
    const problems = configProblems(
      CONFIG,
      Object.values(MODULES),
      SYSTEM_IDS,
      PLATFORM_ID,
      Object.keys(loadContributors()),
    );
    if (problems.length) fail(problems.join('\n'));
    const report = prototypeContext({
      root: ROOT,
      folder: positional[0],
      config: CONFIG,
      systems: SYSTEM_SPECS,
      modules: ENABLED_MODULES,
      contributor: resolveContributor(),
      contributors: Object.keys(loadContributors()),
    });
    say(JSON.stringify(report, null, 2));
  } catch (error) {
    fail(error.message);
  }
}

const commands = {
  configure,
  status,
  context,
  list,
  check,
  sync: () => {
    say(syncAgents() ? 'Updated AGENTS.md.' : 'AGENTS.md is up to date.');
    syncSkills();
  },
  enable: () => setEnabled(positional[0], true),
  disable: () => setEnabled(positional[0], false),
  'rename-system': () => lifecycle('rename'),
  'archive-system': () => lifecycle('archive'),
  'restore-system': () => lifecycle('restore'),
  'delete-system': () => lifecycle('delete'),
  add,
  remove,
  'create-module': () => create('module'),
  'create-system': () => create('system'),
};
if (!command || !Object.hasOwn(commands, command)) {
  console.error(
    `Usage: pnpm studio <command>\n  ${[...Object.keys(commands), 'identity-audit', 'identity-plan', 'identity-apply', 'identify'].join(', ')}\nSee the top of src/platform/node/cli/studio-runtime.js for what each does.`,
  );
  process.exit(command ? 1 : 0);
}
if (flags.recovery && command !== 'configure') fail('--recovery is only for explicit configuration setup or recovery.');
const applies = flags.yes || ['enable', 'disable'].includes(command);
const externalScaffold = ['create-module', 'create-system'].includes(command) && flags.out;
const sharedChange =
  ['configure', 'enable', 'disable', 'add', 'remove', 'create-module', 'create-system'].includes(command) &&
  !externalScaffold;
if (
  applies &&
  sharedChange &&
  !(command === 'configure' && flags.recovery) &&
  studioRole(CONFIG, resolveContributor(), Object.keys(loadContributors())) !== 'admin'
)
  fail(
    'Only an Admin can apply shared configuration changes. Use a pull request for a proposal. Initial setup or recovery uses configure --recovery.',
  );
if (applies && flags.recovery)
  say('Explicit configuration recovery: repository access is being used to restore local permissions.');
await commands[command]();
