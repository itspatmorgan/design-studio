import fs from 'node:fs';
import path from 'node:path';
import { canonicalDirectory } from './safe-paths.js';
import { readResourceDirectory } from './resource-directory.js';
import { readDeclaration } from '../../src/platform/core/declarations.ts';
import { resolveStudioReferences } from '../../src/platform/core/resourceReferences.ts';

// This reader never accepts mutable-key relationship fallbacks. Managed source
// writers retain `persisted`; existing filesystem APIs consume `config` instead.
export function readPersistedStudioConfig(root) {
  const file = path.join(root, 'studio.config.ts');
  if (!canonicalDirectory(root, root) || fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile())
    throw new Error('Studio configuration must be an ordinary source declaration.');
  const source = fs.readFileSync(file, 'utf8');
  const declaration = readDeclaration(source);
  if ('error' in declaration) throw new Error(`studio.config.ts: ${declaration.error}`);
  const directory = readResourceDirectory(root);
  return {
    file,
    source,
    persisted: declaration.value,
    config: resolveStudioReferences(declaration.value, directory),
    directory,
  };
}
