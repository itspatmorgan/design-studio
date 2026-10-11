// Compose source metadata, persisted relationships and browser references in an
// isolated review workspace. Planning never changes the studio being reviewed.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { canonicalDirectory } from './safe-paths.js';
import { planSourceIdentityMigration } from './resource-identity-migration.js';
import { planResourceRelationshipMigration } from './resource-relationship-migration.js';
import { planResourceLinkMigration } from './resource-link-migration.js';
import { auditResourceIdentities } from './resource-identity-audit.js';
import { applySetupChanges } from './studio-setup.js';
import { readDeclaration } from '../../core/declarations.ts';
import { MODULE_ROOTS, SYSTEM_ROOTS } from '../../core/roots.ts';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const slash = value => value.split(path.sep).join('/');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Capture the complete participating trees, including helpers, retained content,
// and component paths used to resolve old system URLs. Binary files are hashed
// and copied as bytes, never decoded or rewritten. Hidden and dependency trees
// are outside the source contract. Symlinks are refused rather than followed.
function capture(root) {
  if (!canonicalDirectory(root, root)) throw new Error('Migration requires an ordinary studio directory.');
  const snapshot = [],
    contents = new Map();
  const visit = relative => {
    const file = path.join(root, relative);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error(`${relative}: migration cannot follow symbolic links.`);
    if (stat.isDirectory()) {
      if (!canonicalDirectory(file, root)) throw new Error(`${relative}: migration requires an ordinary directory.`);
      snapshot.push({ path: relative, kind: 'directory' });
      for (const name of fs.readdirSync(file).sort()) {
        if (!name.startsWith('.') && name !== 'node_modules') visit(`${relative}/${name}`);
      }
    } else if (stat.isFile()) {
      if (!canonicalDirectory(path.dirname(file), root))
        throw new Error(`${relative}: migration requires an ordinary source file.`);
      const bytes = fs.readFileSync(file);
      snapshot.push({ path: relative, kind: 'file', sha256: digest(bytes) });
      contents.set(relative, bytes);
    } else throw new Error(`${relative}: migration requires an ordinary source file.`);
  };
  visit('studio.config.ts');
  for (const directory of ['contributors', ...SYSTEM_ROOTS, 'src/prototypes'])
    if (fs.existsSync(path.join(root, directory))) visit(directory);
  // Module declarations are read from both module roots (src/platform/core/roots.ts).
  for (const modulesRoot of MODULE_ROOTS) {
    const modules = path.join(root, modulesRoot);
    if (!fs.existsSync(modules)) continue;
    if (!canonicalDirectory(modules, root))
      throw new Error('Module declarations require an ordinary source directory.');
    snapshot.push({ path: modulesRoot, kind: 'directory' });
    for (const name of fs.readdirSync(modules).sort()) {
      if (name.startsWith('.')) continue;
      const directory = path.join(modules, name);
      if (fs.lstatSync(directory).isSymbolicLink())
        throw new Error(`${modulesRoot}/${name}: migration cannot follow symbolic links.`);
      if (!fs.lstatSync(directory).isDirectory()) continue;
      snapshot.push({ path: `${modulesRoot}/${name}`, kind: 'directory' });
      if (fs.existsSync(path.join(directory, 'module.ts'))) visit(`${modulesRoot}/${name}/module.ts`);
    }
  }
  return { snapshot, contents };
}

export function planResourceFoundationMigration(root, types, { ids = {}, updated = Date.now(), generate } = {}) {
  if (!Number.isSafeInteger(updated) || updated < 0)
    throw new Error('Migration timestamp must be a nonnegative safe integer.');
  // Audit the original tree before creating the isolated workspace, so planning
  // cannot conceal malformed sources or unsupported artifact paths.
  const source = planSourceIdentityMigration(root, types, { ids, ...(generate && { generate }) });
  const captured = capture(root);
  for (const [file, bytes] of captured.contents)
    if (MODULE_ROOTS.some(modulesRoot => new RegExp(`^${modulesRoot}/[^/]+/module\\.ts$`).test(file))) {
      const declaration = readDeclaration(bytes.toString('utf8'));
      if ('error' in declaration) throw new Error(`${file}: ${declaration.error}`);
      const section = declaration.value.section;
      if (
        section?.items === 'prototypes' &&
        !(declaration.value.id === 'prototypes' && section.byPerson === true && section.folder === 'src/prototypes')
      )
        throw new Error(`${file}: prototype-shaped module sections need an explicit identity policy before migration.`);
    }
  const reviewRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-foundation-review-'));
  try {
    for (const entry of captured.snapshot) {
      const file = path.join(reviewRoot, entry.path);
      if (entry.kind === 'directory') fs.mkdirSync(file, { recursive: true });
      else {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, captured.contents.get(entry.path));
      }
    }
    // Verify that allocation was based on the exact contents captured for review.
    for (const entry of source.snapshot)
      if (captured.contents.get(entry.path)?.toString('utf8') !== entry.before)
        throw new Error('The source changed while preparing the migration. Generate a fresh preview.');
    const merged = new Map();
    const stage = changes => {
      for (const change of changes) {
        const relative = slash(path.relative(reviewRoot, change.file));
        if (!captured.contents.has(relative))
          throw new Error('Migration cannot edit outside its captured source inventory.');
        const previous = merged.get(relative);
        if (previous && previous.after !== change.before)
          throw new Error(`${relative}: migration stages disagree about source content.`);
        merged.set(relative, { path: relative, before: previous?.before ?? change.before, after: change.after });
      }
      applySetupChanges(changes);
    };
    stage(
      source.changes.map(change => ({
        file: path.join(reviewRoot, change.path),
        before: change.before,
        after: change.after,
      })),
    );
    stage(planResourceRelationshipMigration(reviewRoot, types));
    stage(planResourceLinkMigration(reviewRoot, types, { updated }));
    const resources = auditResourceIdentities(reviewRoot, types);
    if (resources.problems.length || resources.missing.length)
      throw new Error('The composed migration did not produce a valid identity inventory.');
    // Detect changes to the real source while the review was being composed.
    if (!equal(capture(root).snapshot, captured.snapshot))
      throw new Error('The source changed while preparing the migration. Generate a fresh preview.');
    return {
      stage: 'resource-foundation',
      version: 1,
      updated,
      snapshot: captured.snapshot,
      resources: resources.resources,
      changes: [...merged.values()]
        .filter(change => change.before !== change.after)
        .sort((a, b) => a.path.localeCompare(b.path)),
    };
  } finally {
    fs.rmSync(reviewRoot, { recursive: true, force: true });
  }
}

// The explicit migration CLI uses this guarded transaction. Treat saved previews
// as data, never as permission to write arbitrary files or trust an after payload.
export function applyResourceFoundationMigration(root, types, plan) {
  if (plan?.stage !== 'resource-foundation' || plan.version !== 1 || !Array.isArray(plan.resources))
    throw new Error('Review a resource foundation migration preview first.');
  const ids = Object.fromEntries(plan.resources.map(resource => [resource.path, resource.studioId]));
  const current = planResourceFoundationMigration(root, types, { ids, updated: plan.updated });
  if (!equal(current, plan))
    throw new Error('The source inventory or migration preview changed. Generate and review a fresh preview.');
  const edits = current.changes.map(change => ({
    file: path.join(root, change.path),
    before: change.before,
    after: change.after,
  }));
  applySetupChanges(edits);
  try {
    const changed = new Map(current.changes.map(change => [change.path, digest(Buffer.from(change.after))]));
    const expected = current.snapshot.map(entry =>
      changed.has(entry.path) ? { ...entry, sha256: changed.get(entry.path) } : entry,
    );
    if (!equal(capture(root).snapshot, expected)) throw new Error('The source inventory changed during migration.');
    const audit = auditResourceIdentities(root, types);
    if (audit.problems.length || audit.missing.length || !equal(audit.resources, current.resources))
      throw new Error('Identity verification failed after migration.');
    if (
      planResourceRelationshipMigration(root, types).length ||
      planResourceLinkMigration(root, types, { updated: plan.updated }).length
    )
      throw new Error('Relationship or browser reference migration is incomplete.');
    return { resources: audit.resources, changed: edits.length };
  } catch (error) {
    try {
      applySetupChanges(edits.map(edit => ({ ...edit, before: edit.after, after: edit.before })).reverse());
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Foundation migration failed and rollback needs review.');
    }
    throw error;
  }
}
