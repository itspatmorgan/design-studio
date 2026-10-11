// Usage:
//   node src/platform/node/check/check-scope.js --staged           (pre-commit, never blocks)
//   node src/platform/node/check/check-scope.js --push             (pre-push, never blocks)
//   node src/platform/node/check/check-scope.js --ci <before> <after>   (CI, fails if out of scope)
import { changedFiles, git } from './changed-files.js';
import { resolveContributor, keyForGithub } from '../cli/resolve-contributor.js';
import { studioRole, canPerform, sameSystemIdentity, parseMaintainers } from '../../core/permissions.ts';
import { readDeclaration } from '../../core/modules/pack.ts';
import { INSTALLED_FILE_TYPES } from '../lib/installed-file-types.js';
import { gitResourceIdentities } from '../lib/git-resource-identities.js';
import { resourceIdentityChangeProblems } from '../lib/resource-identity-changes.js';
import { resourceDirectory, resolveStudioReferences } from '../../core/resourceReferences.ts';
import { MODULE_ROOTS, SYSTEM_ROOTS } from '../../core/roots.ts';

const [mode, before, after, policy] = process.argv.slice(2);
const review = mode === '--ci' && policy === '--review';
const platformMaintainer = mode === '--ci' && ['admin', 'maintain'].includes(process.env.STUDIO_PLATFORM_ROLE);
let changed;
try {
  changed = changedFiles(mode, before, after);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
if (!changed) {
  console.error('Usage: check-scope.js --staged | --push | --ci <before> <after>');
  process.exit(2);
}
const { files, baseRef } = changed;
let baselineInventory;
try {
  const baseline = (baselineInventory = gitResourceIdentities(baseRef ?? 'HEAD', INSTALLED_FILE_TYPES, {
    legacyOwnership: true,
  }));
  const proposed = gitResourceIdentities(after ?? 'HEAD', INSTALLED_FILE_TYPES, { staged: mode === '--staged' });
  const identityProblems = resourceIdentityChangeProblems(baseline, proposed);
  if (identityProblems.length) {
    console.error('Resource identity checks failed:\n' + identityProblems.map(problem => `  ${problem}`).join('\n'));
    if (mode === '--ci') process.exit(1);
  }
} catch (error) {
  console.error(`Resource identity inventory could not be verified: ${error.message}`);
  if (mode === '--ci') process.exit(2);
}
let baseConfig = (() => {
  try {
    const result = readDeclaration(git('show', `${baseRef ?? 'HEAD'}:studio.config.ts`));
    return 'error' in result ? {} : result.value;
  } catch {
    return {};
  }
})();
// Use the before-side mode: changing to personal in a proposal cannot bypass team review.
if (baseConfig.usage === 'personal') {
  console.log('Personal studio: team ownership checks are skipped. Dependency and asset checks still apply.');
  process.exit(0);
}
const actor = process.env.STUDIO_SCOPE_ACTOR ?? process.env.GITHUB_ACTOR;
// CI identity comes from the before-side profiles. Proposed profile edits cannot impersonate a privileged contributor.
const baseProfiles = {};
try {
  for (const file of git('ls-tree', '-r', '--name-only', baseRef ?? 'HEAD', '--', 'contributors').split('\n')) {
    const match = /^contributors\/([a-z0-9][a-z0-9-]*)\.json$/.exec(file);
    if (match) baseProfiles[match[1]] = JSON.parse(git('show', `${baseRef ?? 'HEAD'}:${file}`));
  }
} catch {
  /* Missing base identity is unregistered, never privileged. */
}
// Historical Git baselines can predate the source cutover. Once their default
// is a permanent ID, every grant is resolved strictly through that SAME tree.
// Proposed declarations and the checkout never supply its identity directory.
if (/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/.test(baseConfig.defaultSystem ?? '')) {
  try {
    const systems = Object.fromEntries(
      baselineInventory.resources
        .filter(resource => resource.kind === 'system')
        .map(resource => [resource.key, { studioId: resource.studioId }]),
    );
    baseConfig = resolveStudioReferences(baseConfig, resourceDirectory(baseProfiles, systems));
  } catch (error) {
    console.error(`Before-side authority could not be resolved: ${error.message}`);
    if (mode === '--ci') process.exit(2);
    baseConfig = {};
  }
}
const key = mode === '--ci' ? keyForGithub(actor, baseProfiles) : resolveContributor();
const prefix = key ? `src/prototypes/${key}/` : null;

// An item in a section whose policy is "maintainers" (a section item, src/examples/<id>/) is changed by the people
// listed in its meta.json. The list that counts is the one before the change, so a change can't make its
// author a maintainer of someone else's. An item that is new in the change (a prototype just published)
// has no earlier list, so its own is used.
const beforeModules = [];
try {
  // The trusted declarations are read from the base tree's module roots, wherever that tree kept its modules.
  for (const modulesRoot of MODULE_ROOTS)
    for (const file of git('ls-tree', '-r', '--name-only', baseRef ?? 'HEAD', '--', modulesRoot)
      .split('\n')
      .filter(
        file => file.startsWith(`${modulesRoot}/`) && /^[^/]+\/module\.ts$/.test(file.slice(modulesRoot.length + 1)),
      )) {
      const declaration = readDeclaration(git('show', `${baseRef ?? 'HEAD'}:${file}`));
      if (!('error' in declaration)) beforeModules.push(declaration.value);
    }
} catch {
  /* No trusted declarations grant no section authority. */
}
const MAINTAINED = beforeModules
  .filter(m => m?.section?.policy === 'maintainers' && m.section.items === 'prototypes' && m.section.folder)
  .map(m => m.section.folder);
function toolMeta(ref, folder, id) {
  const file = `${folder}/${id}/meta.json`;
  try {
    const text =
      ref === null && mode === '--staged'
        ? git('show', `:${file}`)
        : git('show', `${ref ?? (mode === '--ci' ? after : 'HEAD')}:${file}`);
    return parseMaintainers(JSON.parse(text).maintainers);
  } catch {
    return null;
  }
}
const maintained = new Map();
function maintains(folder, id) {
  if (!key) return false;
  const name = `${folder}/${id}`;
  if (!maintained.has(name))
    maintained.set(
      name,
      (((baseRef && toolMeta(baseRef, folder, id)) || toolMeta(null, folder, id)) ?? []).includes(key),
    );
  return maintained.get(name);
}
// The maintained section and item a file is in, like ["src/examples", "sample"], or null.
function maintainedItem(f) {
  for (const folder of MAINTAINED) {
    const [id, ...rest] = f.startsWith(`${folder}/`) ? f.slice(folder.length + 1).split('/') : [];
    if (id && rest.length) return [folder, id];
  }
  return null;
}

const studioAdmin = studioRole(baseConfig, key, Object.keys(baseProfiles)) === 'admin';
const systemScope = f => {
  const folder = SYSTEM_ROOTS.find(systemsRoot => f.startsWith(systemsRoot + '/'));
  const match = folder && /^([^/]+)\//.exec(f.slice(folder.length + 1));
  if (!match) return false;
  try {
    const declarationFile = folder + '/' + match[1] + '/system.ts';
    const spec = readDeclaration(git('show', `${baseRef ?? 'HEAD'}:${declarationFile}`));
    if (
      'error' in spec ||
      !canPerform(
        baseConfig,
        key,
        Object.keys(baseProfiles),
        { kind: 'system', id: match[1], role: spec.value.role, status: spec.value.status },
        'edit',
      )
    )
      return false;
    if (f === declarationFile) {
      const next = readDeclaration(mode === '--staged' ? git('show', ':' + f) : git('show', `${after ?? 'HEAD'}:${f}`));
      return !('error' in next) && sameSystemIdentity(spec.value, next.value);
    }
    return true;
  } catch {
    return false;
  }
};
const isInScope = f =>
  studioAdmin ||
  systemScope(f) ||
  (prefix && f.startsWith(prefix)) ||
  (key && f === `contributors/${key}.json`) ||
  (m => Boolean(m) && maintains(...m))(maintainedItem(f));
const inScope = files.filter(isInScope);
const platform = files.filter(f => !isInScope(f));

const who = key ?? (mode === '--ci' ? `unknown actor "${actor ?? ''}"` : 'unknown contributor');
console.log(`Scope check (${who}): ${inScope.length} in scope, ${platform.length} outside assigned scope.`);
if (!key) console.log('  Not registered in contributors/, so every file counts as out of scope.');
for (const f of platform)
  console.log(
    `  ${SYSTEM_ROOTS.some(systemsRoot => f.startsWith(systemsRoot + '/')) ? 'system' : MODULE_ROOTS.some(modulesRoot => f.startsWith(modulesRoot + '/')) ? 'module' : f.startsWith('src/prototypes/') ? 'prototype' : 'platform'}: ${f}`,
  );

if (platform.length && review)
  console.log('  Platform changes require maintainer review before merging. Configure required reviews on main.');
if (platform.length && platformMaintainer)
  console.log('  Platform changes accepted from a repository admin or maintainer.');
if (mode === '--ci' && platform.length && !review && !platformMaintainer) process.exit(1);
process.exit(0);
