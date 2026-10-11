import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './create.js';
import { PROTOTYPE_SYSTEMS } from '../../systems/node/systems.js';
import { canonicalDirectory } from '../../../node/lib/safe-paths.js';
import { moveWithLinks, personAddress } from '../../../node/lib/prototype-links.js';
import { buildManifest } from '../../../node/build/build-manifest.js';
import { INSTALLED_FILE_TYPES } from '../../../node/lib/file-types.js';
import {
  retainedResourceIds,
  allocateResourceIdentity,
  identifyPrototypeArtifacts,
} from '../../../node/lib/resource-identity-lifecycle.js';
import { prototypeAssignment } from '../../../node/lib/prototype-assignment.js';
import { loadContributors } from '../../../node/lib/contributors.js';
import { resourceId } from '../../../core/fileTypes.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._-]*$/i.test(value);
const excluded = new Set(['.git', 'node_modules', '.trash']);

function checkFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error('Remove symbolic links from the prototype before duplicating it.');
    if (entry.isDirectory()) checkFiles(path.join(dir, entry.name));
    else if (!entry.isFile()) throw new Error('Only ordinary files and folders can be duplicated.');
  }
}

// A different target starts a rebuild request. Keep the actual assignment until the
// copied implementation is migrated, so the original and copy remain runnable.
export function duplicatePrototype({ key, id, title, system }) {
  title = typeof title === 'string' ? title.trim() : '';
  const slug = slugify(title);
  if (!slug) throw new Error('Add a title with at least one letter or number.');
  if (!validId(key) || !validId(id)) throw new Error('Invalid prototype address.');
  const parent = path.join(ROOT, 'src/prototypes', key);
  const from = path.join(parent, id);
  const to = path.join(parent, slug);
  if (!canonicalDirectory(from, ROOT) || !canonicalDirectory(parent, ROOT))
    throw new Error('This prototype is unavailable.');
  if (fs.existsSync(to)) throw new Error('A prototype with that name already exists. Choose another title.');
  checkFiles(from);
  const used = retainedResourceIds(ROOT, INSTALLED_FILE_TYPES);
  const meta = JSON.parse(fs.readFileSync(path.join(from, 'meta.json'), 'utf8'));
  const previousPrototypeId = resourceId(meta.studioId);
  if (resourceId(meta.ownerContributorId) !== resourceId(loadContributors()[key]?.studioId))
    throw new Error('Prototype owner does not match its contributor folder.');
  meta.studioId = allocateResourceIdentity(used);
  const assignment = prototypeAssignment(meta, PROTOTYPE_SYSTEMS);
  if (assignment.problems.length) throw new Error(assignment.problems.join('\n'));
  const sourceSystem = assignment.system;
  const targetSystemKey = system === undefined ? sourceSystem : system;
  for (const assigned of [sourceSystem, targetSystemKey])
    if (
      assigned !== null &&
      (!Object.hasOwn(PROTOTYPE_SYSTEMS, assigned) || PROTOTYPE_SYSTEMS[assigned].status !== 'active')
    )
      throw new Error('Choose an installed prototype system, or no system.');
  const now = new Date();
  meta.title = title;
  meta.created = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  meta.systemId = assignment.systemId;
  delete meta.status;
  delete meta.rebuild;
  if (targetSystemKey !== sourceSystem)
    meta.rebuild = {
      targetSystemId: targetSystemKey === null ? null : resourceId(PROTOTYPE_SYSTEMS[targetSystemKey].studioId),
      sourcePrototypeId: previousPrototypeId,
    };
  fs.mkdirSync(to);
  try {
    fs.cpSync(from, to, {
      recursive: true,
      force: false,
      errorOnExist: true,
      filter: file => file === from || !excluded.has(path.basename(file)),
    });
    identifyPrototypeArtifacts(to, INSTALLED_FILE_TYPES, used, meta.studioId, previousPrototypeId);
    moveWithLinks(to, to, meta, personAddress(key, id), `/prototypes/${key}/${slug}`, `/prototypes/${key}/${id}`);
    return { id: slug, manifest: buildManifest().manifest };
  } catch (error) {
    fs.rmSync(to, { recursive: true, force: true });
    throw error;
  }
}
