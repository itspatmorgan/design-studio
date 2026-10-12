// Current repository source links resolve to their canonical owner browser.
import { MODULE_GLOB_ROOTS, SUPPLIED_SYSTEMS_ROOT } from '../../core/roots.ts';
const ownerPath = (id: string) =>
  (id === 'platform.core' || id.startsWith('module.') ? '/documentation/context/' : '/systems/') + id;
// Translate repository source links into the current owner browser.
function sourceMarkdownPath(path: string): string {
  // A system in the supplied root (/platform/systems/studio/context/x.md) is addressed like any system: /systems/studio/context/x.md.
  const supplied = SUPPLIED_SYSTEMS_ROOT.replace(/^src/, '') + '/';
  if (path.startsWith(supplied)) path = '/systems/' + path.slice(supplied.length);
  // A module is addressed by its id wherever its folder is (/platform/modules/canvas/README.md and
  // /modules/research/README.md both read as /modules/<id>/...), so either root resolves the same way.
  for (const root of MODULE_GLOB_ROOTS)
    if (path.startsWith(root + '/')) path = '/modules/' + path.slice(root.length + 1);
  const chapter = path.match(/^\/modules\/documentation\/pages\/([a-z0-9-]+)\.md$/);
  if (chapter) return '/documentation/manual' + (chapter[1] === 'index' ? '' : '/' + chapter[1]);
  if (path === '/modules/README.md') return ownerPath('platform.core') + '/context/modules';
  const readme = path.match(/^\/(platform|modules\/([^/]+)|systems\/([^/]+))\/README\.md$/);
  if (readme)
    return ownerPath(readme[1] === 'platform' ? 'platform.core' : readme[2] ? 'module.' + readme[2] : readme[3]);
  const knowledge = path.match(/^\/(platform|modules\/([^/]+)|systems\/([^/]+))\/(context|skills)(\/.*)?$/);
  if (knowledge)
    return (
      ownerPath(
        knowledge[1] === 'platform' ? 'platform.core' : knowledge[2] ? 'module.' + knowledge[2] : knowledge[3],
      ) +
      '/' +
      knowledge[4] +
      (knowledge[5] ?? '').replace(/\.md$/, '')
    );
  const contract = path.match(/^\/modules\/([^/]+)\/([^/]+)\.md$/);
  if (contract) return ownerPath('module.' + contract[1]) + '/reference/' + contract[2] + '.md';
  return path;
}

// Translate filesystem links at render time. Stored public URLs already carry IDs.
export function markdownPath(path: string, systemIdentities: Readonly<Record<string, string>> = {}): string {
  const target = sourceMarkdownPath(path);
  const parts = /^\/systems\/([^/]+)(.*)$/.exec(target);
  return parts && systemIdentities[parts[1]] ? '/systems/' + systemIdentities[parts[1]] + parts[2] : target;
}
