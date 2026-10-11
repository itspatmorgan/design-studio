// Read-only migration inventory. No manifest generation, identity assignment, or
// source repair happens here. Retained disabled file types are inspected too.
import fs from 'node:fs';
import path from 'node:path';
import { resourceId, jsonIdentity } from '../../src/platform/core/resourceIdentity.ts';
import { isHelper } from '../../src/platform/core/fileTypes.ts';
import { readDeclaration } from '../../src/platform/core/declarations.ts';
import { canonicalDirectory } from './safe-paths.js';

export function auditResourceIdentities(root, types) {
  const resources = [],
    problems = [],
    missing = [];
  const seen = new Map();
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const entries = directory => {
    if (!fs.existsSync(directory)) return [];
    if (!canonicalDirectory(directory, root)) {
      problems.push(`${relative(directory)} must be an ordinary directory.`);
      return [];
    }
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  };
  const source = file => {
    if (
      !canonicalDirectory(path.dirname(file), root) ||
      !fs.existsSync(file) ||
      fs.lstatSync(file).isSymbolicLink() ||
      !fs.lstatSync(file).isFile()
    )
      throw new Error('Expected an ordinary source file.');
    return fs.readFileSync(file, 'utf8');
  };
  const record = (kind, file, read, context = {}) => {
    const location = relative(file);
    try {
      const id = read(source(file));
      const resource = { kind, path: location, studioId: id, ...context };
      resources.push(resource);
      if (id === null) missing.push(location);
      else {
        resourceId(id);
        if (seen.has(id)) problems.push(`${location}: resource ID ${id} is already declared in ${seen.get(id)}.`);
        else seen.set(id, location);
      }
    } catch (error) {
      problems.push(`${location}: ${error.message}`);
    }
  };
  const contributors = path.join(root, 'contributors');
  for (const entry of entries(contributors))
    if (entry.name.endsWith('.json'))
      record('contributor', path.join(contributors, entry.name), jsonIdentity, { key: entry.name.slice(0, -5) });

  const systems = path.join(root, 'src/systems');
  for (const entry of entries(systems))
    if (!entry.name.startsWith('.')) {
      if (entry.isSymbolicLink()) {
        problems.push(`${relative(path.join(systems, entry.name))}: system directories cannot be symbolic links.`);
        continue;
      }
      if (!entry.isDirectory()) continue;
      record(
        'system',
        path.join(systems, entry.name, 'system.ts'),
        text => {
          const declaration = readDeclaration(text);
          if ('error' in declaration) throw new Error(declaration.error);
          return declaration.value.studioId === undefined ? null : resourceId(declaration.value.studioId);
        },
        { key: entry.name },
      );
    }

  const walkArtifacts = (directory, parent, ownerKey) => {
    for (const entry of entries(directory)) {
      if (entry.name.startsWith('.') || isHelper(entry.name) || entry.name === 'node_modules') continue;
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        problems.push(`${relative(file)}: artifact paths cannot be symbolic links.`);
        continue;
      }
      if (entry.isDirectory()) {
        walkArtifacts(file, parent, ownerKey);
        continue;
      }
      const matches = Object.entries(types).filter(
        ([, spec]) => spec.inPrototype && spec.extensions.some(extension => entry.name.endsWith(extension)),
      );
      if (matches.length > 1) {
        problems.push(`${relative(file)}: more than one installed file type claims this artifact.`);
        continue;
      }
      const match = matches[0];
      if (!match) continue;
      const [fileType, spec] = match;
      if (!spec.identity) {
        problems.push(`${relative(file)}: installed file type ${fileType} has no identity adapter.`);
        continue;
      }
      record('artifact', file, text => spec.identity.read(text), { parent, ownerKey, fileType });
    }
  };
  const prototypes = path.join(root, 'src/prototypes');
  for (const owner of entries(prototypes)) {
    if (owner.name.startsWith('.')) continue;
    if (owner.isSymbolicLink()) {
      problems.push(
        `${relative(path.join(prototypes, owner.name))}: contributor directories cannot be symbolic links.`,
      );
      continue;
    }
    if (!owner.isDirectory()) continue;
    for (const prototype of entries(path.join(prototypes, owner.name))) {
      if (prototype.name.startsWith('.')) continue;
      if (prototype.isSymbolicLink()) {
        problems.push(
          `${relative(path.join(prototypes, owner.name, prototype.name))}: prototype directories cannot be symbolic links.`,
        );
        continue;
      }
      if (!prototype.isDirectory()) continue;
      const directory = path.join(prototypes, owner.name, prototype.name);
      const parent = relative(directory);
      const metadataFile = path.join(directory, 'meta.json');
      try {
        const metadata = JSON.parse(source(metadataFile));
        if (metadata.ownerContributorId !== undefined) {
          resourceId(metadata.ownerContributorId);
          const contributor = resources.find(
            resource => resource.kind === 'contributor' && resource.key === owner.name,
          );
          if (!contributor || contributor.studioId !== metadata.ownerContributorId)
            problems.push(
              `${relative(metadataFile)}: ownerContributorId must match the contributor identity declared for its source folder.`,
            );
        }
      } catch (error) {
        problems.push(`${relative(metadataFile)}: ${error.message}`);
      }
      record('prototype', metadataFile, jsonIdentity, { key: prototype.name, ownerKey: owner.name });
      walkArtifacts(directory, parent, owner.name);
    }
  }
  return { resources, missing, problems };
}
