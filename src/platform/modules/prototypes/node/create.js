// Usage: pnpm new "Prototype Name"
// Also used by the app's "New prototype" button in dev (src/platform/node/build/vite-files-plugin.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from '../../../node/build/build-manifest.js';
import { rootOf } from '../../../core/roots.ts';
import { PROTOTYPE_SECTIONS } from '../../../node/lib/modules.js';
import { resolveContributor } from '../../../node/cli/resolve-contributor.js';
import { moveWithLinks, personAddress } from '../../../node/lib/prototype-links.js';
import { DEFAULT_SYSTEM, PROTOTYPE_SYSTEMS } from '../../systems/node/systems.js';
import { INSTALLED_FILE_TYPES } from '../../../node/lib/file-types.js';
import {
  retainedResourceIds,
  allocateResourceIdentity,
  identifyPrototypeArtifacts,
} from '../../../node/lib/resource-identity-lifecycle.js';
import { KEY, loadContributors } from '../../../node/lib/contributors.js';
import { prototypeAddress, resourceId } from '../../../core/fileTypes.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

// "Agent Config" → "agent-config"
export const slugify = title =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Copies src/platform/node/templates/prototype/ into src/prototypes/<key>/<slug>/,
// fills in meta.json, and rebuilds the manifest. Returns { slug, manifest }, or throws a message.
export function createPrototype({ title, key, system = DEFAULT_SYSTEM }) {
  title = (title ?? '').trim();
  if (!title) throw new Error('Add a title.');
  const slug = slugify(title);
  if (!slug) throw new Error('Use at least one letter or number in the title.');
  if (!key) throw new Error("You're not set up as a contributor yet. Ask your agent to add you.");
  const contributors = loadContributors();
  if (!KEY.test(key) || !Object.hasOwn(contributors, key)) throw new Error('Choose a registered contributor.');
  if (system !== null && (!Object.hasOwn(PROTOTYPE_SYSTEMS, system) || PROTOTYPE_SYSTEMS[system].status !== 'active'))
    throw new Error('Choose an installed prototype system, or null for no system.');
  const dest = path.join(ROOT, 'src', 'prototypes', key, slug);
  if (fs.existsSync(dest)) throw new Error(`You already have a prototype named “${title}”. Choose a different title.`);
  const used = retainedResourceIds(ROOT, INSTALLED_FILE_TYPES);
  const studioId = allocateResourceIdentity(used);

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.cpSync(path.join(ROOT, 'src', 'platform', 'node', 'templates', 'prototype'), dest, { recursive: true });
    const metaPath = path.join(dest, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    Object.assign(meta, {
      studioId,
      ownerContributorId: resourceId(contributors[key].studioId),
      title,
      created: today,
      systemId: system === null ? null : resourceId(PROTOTYPE_SYSTEMS[system].studioId),
    });
    identifyPrototypeArtifacts(dest, INSTALLED_FILE_TYPES, used, studioId);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    return { slug, manifest: buildManifest().manifest };
  } catch (error) {
    fs.rmSync(dest, { recursive: true, force: true });
    throw error;
  }
}

// Changes a prototype's title, and renames its folder to match when the title
// changed ("Checkout Flow" → checkout-flow), while its permanent link stays the same. Nothing changes if that folder
// name is taken. Returns { id, manifest }, where id is the folder name now, or throws a message.
export function renamePrototype({ key, id, title }) {
  title = (title ?? '').trim();
  if (!title) throw new Error('Add a title.');
  const slug = slugify(title);
  if (!slug) throw new Error('Use at least one letter or number in the title.');
  // An item of a module's section (a section item) has its folder name as its address (/examples/<id>), which people rely on, so it keeps its name.
  const sectionItem = PROTOTYPE_SECTIONS.some(s => s.key === key);
  const from = path.join(ROOT, 'src', rootOf(key, id));
  const metaFile = path.join(from, 'meta.json');
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  // Only a new title renames a folder named differently from its title.
  const rename = !sectionItem && title !== meta.title && slug !== id;
  const to = path.join(ROOT, 'src', 'prototypes', key, slug);
  if (rename && fs.existsSync(to))
    throw new Error(`You already have a prototype in a folder called “${slug}”. Choose a different title.`);
  meta.title = title;
  if (rename)
    moveWithLinks(from, to, meta, personAddress(key, id), `/prototypes/${key}/${slug}`, `/prototypes/${key}/${id}`);
  else fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
  return { id: rename ? slug : id, manifest: buildManifest().manifest };
}

// Run as a script.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2).filter(a => a !== '--');
  let system = DEFAULT_SYSTEM;
  const titleParts = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--no-system') system = null;
    else if (args[i] === '--system') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) {
        console.error('Provide an installed system ID after --system.');
        process.exit(1);
      }
      system = args[++i];
    } else if (args[i].startsWith('--')) {
      console.error(`Unknown option: ${args[i]}`);
      process.exit(1);
    } else titleParts.push(args[i]);
  }
  const title = titleParts.join(' ');
  if (!title.trim()) {
    console.error('Usage: pnpm new "Prototype Name" [--system <id> | --no-system]');
    process.exit(1);
  }
  const key = resolveContributor();
  try {
    const { slug } = createPrototype({ title, key, system });
    console.log(`Created src/prototypes/${key}/${slug}/`);
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/prototypes', key, slug, 'meta.json'), 'utf8'));
    console.log(`Open it with pnpm dev, at ${prototypeAddress(resourceId(meta.studioId))}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
