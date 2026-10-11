import fs from 'node:fs';
import path from 'node:path';
import { canonicalDirectory } from '../../lib/safe-paths.js';
import { MAX_SOURCE_BYTES, versionOf } from './paths.js';

export function documentationSources(root, manifest) {
  const allowed = [
    ...manifest.platformReferences.flatMap(group => group.references.map(ref => 'src' + ref.source)),
    ...manifest.manual.map(page => 'src' + (page.source ?? '/modules/documentation/pages/' + page.slug + '.md')),
  ];
  // Keep standalone chapters repairable when their metadata is temporarily invalid.
  const folder = 'src/modules/documentation/pages';
  if (
    manifest.platformReferences.some(group => group.id === 'documentation' && group.enabled) &&
    fs.existsSync(path.join(root, folder))
  ) {
    allowed.push(
      ...fs
        .readdirSync(path.join(root, folder), { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => folder + '/' + entry.name),
    );
  }
  return [...new Set(allowed)];
}

// Only files in the caller’s current catalog are editable; callers supply the current enabled catalog.
export function sourceFile(root, allowed, request) {
  if (!request || typeof request !== 'object' || !['read', 'write', 'reveal'].includes(request.action))
    return { status: 400, body: { error: 'Choose a source file action.' } };
  if (typeof request.path !== 'string' || !allowed.includes(request.path))
    return { status: 404, body: { error: 'This source file is unavailable.' } };
  const file = path.join(root, request.path);
  if (!canonicalDirectory(path.dirname(file), root))
    return { status: 404, body: { error: 'This source file is unavailable.' } };
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch {
    return { status: 404, body: { error: 'This source file is unavailable.' } };
  }
  if (!stat.isFile() || stat.isSymbolicLink())
    return { status: 404, body: { error: 'This source file is unavailable.' } };
  if (request.action === 'reveal') return { body: { ok: true }, reveal: file };
  if (stat.size > MAX_SOURCE_BYTES) return { status: 413, body: { error: 'Keep source files under 750 KB.' } };
  const content = fs.readFileSync(file, 'utf8');
  if (request.action === 'read') return { body: { path: request.path, content, version: versionOf(content) } };
  if (typeof request.content !== 'string' || Buffer.byteLength(request.content) > MAX_SOURCE_BYTES)
    return { status: 413, body: { error: 'Keep source files under 750 KB.' } };
  if (request.base !== versionOf(content))
    return { status: 409, body: { code: 'changed', error: 'This source changed on disk. Reload before saving.' } };
  fs.writeFileSync(file, request.content);
  return { body: { version: versionOf(request.content) } };
}
