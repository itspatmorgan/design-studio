import { discoverComponents } from '../../modules/systems/docs.ts';
import { snapshotFiles } from './artifact-moves.js';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prototypeAddress, artifactAddress, resourceId, systemAddress } from '../../core/resourceIdentity.ts';
import { artifactSlug } from '../../core/fileTypes.ts';
import { auditResourceIdentities } from './resource-identity-audit.js';
import { linkedFiles } from './prototype-links.js';
import { escapeAddress } from './prototype-links.js';
import { rewriteResourceLinks } from './resource-links.js';
import { systemDirOf } from './system-folders.js';

// References inside prototype work are migrated once. No compatibility routes
// are installed. Source imports and relative links retain their filesystem role.
export function planResourceLinkMigration(root, types, { updated = Date.now() } = {}) {
  if (!Number.isSafeInteger(updated) || updated < 0)
    throw new Error('Migration timestamp must be a nonnegative safe integer.');
  const audit = auditResourceIdentities(root, types);
  if (audit.problems.length || audit.missing.length)
    throw new Error('Complete source identity metadata before migrating stored links.');
  const contributorKeys = audit.resources
    .filter(resource => resource.kind === 'contributor')
    .map(resource => escapeAddress(resource.key));
  const shortRoute = contributorKeys.length ? new RegExp(`^/(?:${contributorKeys.join('|')})/[^/]+(?:/|$)`) : null;
  const legacyRoute = value =>
    (/^\/prototypes\//.test(value) &&
      !/^\/prototypes\/[0-9abcdefghjkmnpqrstvwxyz]{16}(?:\/artifacts\/[0-9abcdefghjkmnpqrstvwxyz]{16})?\/?$/.test(
        value,
      )) ||
    /^\/systems\/(?![0-9abcdefghjkmnpqrstvwxyz]{16}(?:\/|$))/.test(value) ||
    shortRoute?.test(value);
  const routes = new Map(),
    prefixes = new Map(),
    changes = [];
  const prototypes = audit.resources.filter(resource => resource.kind === 'prototype');
  for (const prototype of prototypes) {
    const parent = path.posix.dirname(prototype.path);
    for (const base of [
      `/prototypes/${prototype.ownerKey}/${prototype.key}`,
      `/${prototype.ownerKey}/${prototype.key}`,
    ]) {
      routes.set(base, prototypeAddress(resourceId(prototype.studioId)));
      for (const artifact of audit.resources.filter(
        resource => resource.kind === 'artifact' && resource.parent === parent,
      )) {
        const relative = path.posix.relative(parent, artifact.path);
        const destination = artifactAddress(resourceId(prototype.studioId), resourceId(artifact.studioId));
        routes.set(`${base}/${artifactSlug(relative)}`, destination);
        routes.set(`${base}/${relative}`, destination);
      }
    }
  }
  for (const system of audit.resources.filter(resource => resource.kind === 'system')) {
    const before = `/systems/${system.key}`,
      after = systemAddress(resourceId(system.studioId));
    prefixes.set(before, after);
    const directory = path.join(root, systemDirOf(root, system.key), 'components');
    const components = discoverComponents(fs.existsSync(directory) ? [...snapshotFiles(directory).keys()] : []);
    for (const component of components)
      routes.set(`${before}/${component.slug}`, `${after}/components/${component.slug}`);
    if (system.key === 'marketing') routes.set(`${before}/rules/marketing-design`, `${after}/context/design`);
  }
  for (const prototype of prototypes)
    for (const file of linkedFiles(path.join(root, path.posix.dirname(prototype.path)))) {
      const before = fs.readFileSync(file, 'utf8');
      const after = rewriteResourceLinks(before, file, routes, prefixes, {
        updated,
        unresolved: route => {
          if (legacyRoute(route))
            throw new Error(
              `${path.relative(root, file)}: unresolved stored browser reference ${route}. Repair or remove it before the full cutover.`,
            );
        },
        computed: value => {
          if (/\/prototypes\/|\/systems\//.test(value))
            throw new Error(
              `${path.relative(root, file)}: computed browser reference needs review before the full cutover: ${value}`,
            );
        },
        // Replaying a reviewed preview must reproduce the exact scene content.
        nonce: (element, next) =>
          createHash('sha256')
            .update(JSON.stringify([element, next, updated]))
            .digest()
            .readUInt32BE(0) & 0x7fffffff,
      });
      if (after !== before) changes.push({ file, before, after });
    }
  return changes;
}
