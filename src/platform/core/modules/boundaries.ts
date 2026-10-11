// Who may import platform code, and how. Platform code and the supplied modules (src/platform/modules/<id>/) ship
// in the same release, so they import platform files directly. The team's modules (src/modules/<id>/) and systems
// (src/systems/<id>/) are written against the public API instead: src/platform/api/<entry>.ts, imported as
// #studio/<entry> through the root package.json "imports" field. That covers browser and Node files alike.
// Imports between modules go through @module/<id> and are judged by the module checks, not here.
import { TEAM_MODULES_ROOT, TEAM_SYSTEMS_ROOT } from '../roots.ts';

export const API_FOLDER = 'src/platform/api';
// One file per entry in API_FOLDER; a test keeps this list and the folder the same.
export const API_ENTRIES = ['module', 'system', 'files', 'data', 'ui', 'components'] as const;
export const apiSpecifier = (entry: string) => `#studio/${entry}`;

const TEAM_ROOTS = [TEAM_MODULES_ROOT, TEAM_SYSTEMS_ROOT];
// A file inside one of the team's module or system folders (not the root's own README).
export const isTeamCode = (file: string) =>
  TEAM_ROOTS.some(root => file.startsWith(`${root}/`) && file.slice(root.length + 1).includes('/'));

// What is wrong with `importer` (a repository path) importing `target` (the repository path it resolved to) as
// `specifier` (what the import says), or null when nothing is.
export function platformImportProblem(importer: string, target: string, specifier: string): string | null {
  if (!isTeamCode(importer) || !target.startsWith('src/platform/')) return null;
  const entry = API_ENTRIES.find(e => specifier === apiSpecifier(e));
  if (entry && target === `${API_FOLDER}/${entry}.ts`) return null;
  // A module's public library, @module/<id>, can sit in the supplied module root; the module checks judge it.
  if (specifier.startsWith('@module/')) return null;
  const kind = importer.startsWith(`${TEAM_SYSTEMS_ROOT}/`) ? 'A team system' : 'A team module';
  return `${importer} imports platform code (${target}) as "${specifier}". ${kind} imports the platform only through its public API: ${API_ENTRIES.map(apiSpecifier).join(', ')} (src/platform/context/modules.md).`;
}
