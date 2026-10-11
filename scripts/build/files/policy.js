import { ROOT, safeScope } from './paths.js';
// Who may change a prototype's files: the policy of its section (src/platform/core/permissions.ts).
// Part of the dev server's file layer (scripts/build/vite-files-plugin.js).
import fs from 'node:fs';
import path from 'node:path';
import { canOwn, parseMaintainers, policyFor, whyNot } from '../../../src/platform/core/permissions.ts';
import { readContributors } from '../../lib/contributors.js';
import { readSettings } from '../../lib/studio-settings.js';
import { canPerform, pathResource, sameSystemIdentity } from '../../../src/platform/core/permissions.ts';
import { readDeclaration } from '../../../src/platform/core/declarations.ts';
import { MODULES } from '../../lib/modules.js';
import { jsonIdentity, resourceId } from '../../../src/platform/core/resourceIdentity.ts';
import { canonicalDirectory } from '../../lib/safe-paths.js';

// Artifact ownership composes with current resource grants. Shared system content
// requires an assigned maintainer; Admin authority also covers other contributors' prototypes.
export const maintainersOf = dir => {
  try {
    return parseMaintainers(JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')).maintainers) ?? [];
  } catch {
    return [];
  }
};
export const policyOf = contributor => policyFor(contributor, Object.values(MODULES));
export const subjectOf = (contributor, me, dir) => ({
  me,
  key: contributor,
  maintainers: policyOf(contributor) === 'maintainers' ? maintainersOf(dir) : undefined,
});
export function prototypeOwnershipMatches(contributor, dir, root = ROOT) {
  const relative = path.relative(root, dir).split(path.sep).join('/');
  const prototype = /^src\/prototypes\/([^/]+)\/[^/]+$/.exec(relative);
  if (!prototype) return true; // Shared resources use their independent grant policy.
  if (prototype[1] !== contributor) return false;
  if (!fs.existsSync(dir)) return true; // Creation is authorized before the folder exists.
  if (!canonicalDirectory(dir, root)) return false;
  try {
    const file = path.join(dir, 'meta.json');
    if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) return false;
    const text = fs.readFileSync(file, 'utf8'),
      id = jsonIdentity(text),
      meta = JSON.parse(text);
    if (id && meta.ownerContributorId === undefined) return false;
    if (meta.ownerContributorId === undefined) return true; // Transitional unidentified source.
    const { contributors, problems } = readContributors(root);
    return !problems.length && resourceId(meta.ownerContributorId) === resourceId(contributors[contributor]?.studioId);
  } catch {
    return false;
  }
}
export const owns = (contributor, me, dir) =>
  Boolean(safeScope(dir)) &&
  prototypeOwnershipMatches(contributor, dir) &&
  policyOf(contributor) !== 'open' &&
  (canOwn(policyOf(contributor), subjectOf(contributor, me, dir)) || canWriteSource(me, path.relative(ROOT, dir)));
export const canChange = (contributor, me, dir) =>
  Boolean(safeScope(dir)) &&
  prototypeOwnershipMatches(contributor, dir) &&
  (canOwn(policyOf(contributor), subjectOf(contributor, me, dir)) || canWriteSource(me, path.relative(ROOT, dir)));

// Why you can't change a prototype: it's someone else's, you aren't a maintainer, or you aren't set up yet.
export const ownerError = (contributor, me) =>
  policyOf(contributor) === 'open'
    ? 'Only an Admin or an assigned system maintainer can change this shared resource. You can propose changes in a pull request.'
    : whyNot(policyOf(contributor), me);

// Refresh grants from disk on every write, including while settings are restarting.
export function canWriteSource(me, file, root = ROOT, content) {
  if (
    typeof file !== 'string' ||
    !file.startsWith('src/') ||
    file.split('/').some(part => part === '..' || part === '.')
  )
    return false;
  const { contributors, problems } = readContributors(root);
  if (problems.length) return false;
  const { config } = readSettings(root, contributors);
  const prototype = /^src\/prototypes\/([^/]+)\/([^/]+)(?:\/|$)/.exec(file);
  if (prototype) {
    if (!prototypeOwnershipMatches(prototype[1], path.join(root, 'src/prototypes', prototype[1], prototype[2]), root))
      return false;
    try {
      const metadataPath = path.join(root, 'src/prototypes', prototype[1], prototype[2], 'meta.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (
          metadata.ownerContributorId !== undefined &&
          metadata.ownerContributorId !== contributors[prototype[1]]?.studioId
        )
          return false;
        if (file.endsWith('/meta.json') && typeof content === 'string') {
          jsonIdentity(content);
          const next = JSON.parse(content);
          if (metadata.studioId !== next.studioId || metadata.ownerContributorId !== next.ownerContributorId)
            return false;
        }
      }
    } catch {
      return false;
    }
  }
  const systems = {};
  const id = /^src\/systems\/([^/]+)(?:\/|$)/.exec(file)?.[1];
  if (id) {
    if (!config.systems?.includes(id)) return false;
    try {
      const declaration = readDeclaration(fs.readFileSync(path.join(root, 'src/systems', id, 'system.ts'), 'utf8'));
      if ('error' in declaration) return false;
      systems[id] = declaration.value;
      if (file === 'src/systems/' + id + '/system.ts' && typeof content === 'string') {
        const next = readDeclaration(content);
        if ('error' in next || !sameSystemIdentity(declaration.value, next.value)) return false;
      }
    } catch {
      return false;
    }
  }
  return canPerform(config, me, Object.keys(contributors), pathResource(file, systems), 'edit');
}
