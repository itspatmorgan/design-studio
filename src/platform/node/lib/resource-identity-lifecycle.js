import fs from 'node:fs';
import path from 'node:path';
import { createResourceId, resourceId, prototypeAddress, artifactAddress } from '../../core/resourceIdentity.ts';
import { auditResourceIdentities } from './resource-identity-audit.js';
import { linkedFiles } from './prototype-links.js';
import { rewriteResourceLinks } from './resource-links.js';

export function retainedResourceIds(root, types) {
  const audit = auditResourceIdentities(root, types);
  if (audit.problems.length) throw new Error(audit.problems.join('\n'));
  return new Set(audit.resources.flatMap(resource => (resource.studioId ? [resource.studioId] : [])));
}

export function allocateResourceIdentity(used) {
  for (let attempt = 0; attempt < 32; attempt++) {
    const id = createResourceId();
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
  }
  throw new Error('Could not allocate a unique resource identity.');
}

// Only used inside a newly created/copied destination, whose caller owns rollback.
export function identifyPrototypeArtifacts(directory, types, used, prototypeId, previousPrototypeId) {
  const routes = new Map();
  if (previousPrototypeId)
    routes.set(prototypeAddress(resourceId(previousPrototypeId)), prototypeAddress(resourceId(prototypeId)));
  const walk = folder => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_') || entry.name === 'node_modules') continue;
      const file = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Identity creation refuses symbolic artifact paths.');
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      const matches = Object.values(types).filter(
        spec => spec.inPrototype && spec.extensions.some(extension => entry.name.endsWith(extension)),
      );
      if (matches.length > 1) throw new Error(`${file}: multiple file types claim this artifact.`);
      const spec = matches[0];
      if (!spec) continue;
      if (!spec.identity) throw new Error(`${file}: its file type needs an identity adapter.`);
      const source = fs.readFileSync(file, 'utf8');
      const previous = spec.identity.read(source);
      const id = allocateResourceIdentity(used);
      fs.writeFileSync(file, spec.identity.write(source, id));
      if (previous && previousPrototypeId)
        routes.set(
          artifactAddress(resourceId(previousPrototypeId), previous),
          artifactAddress(resourceId(prototypeId), id),
        );
    }
  };
  walk(directory);
  for (const file of linkedFiles(directory)) {
    const source = fs.readFileSync(file, 'utf8');
    const next = rewriteResourceLinks(source, file, routes);
    if (next !== source) fs.writeFileSync(file, next);
  }
}
