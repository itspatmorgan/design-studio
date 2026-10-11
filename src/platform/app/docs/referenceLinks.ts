// Compatibility routes preserve saved links to guidance moved in the ownership migration.
import { MODULE_GLOB_ROOTS, SUPPLIED_SYSTEMS_ROOT } from '../../core/roots.ts';
const movedRules: Record<string, string> = {
  'prototype-workflow': 'module.prototypes/skills/build-prototype/SKILL',
  archiving: 'module.prototypes/skills/organize-prototype/SKILL',
  canvases: 'module.canvas/skills/use-canvas/SKILL',
  documents: 'module.document/skills/write-document/SKILL',
  diagrams: 'module.diagrams/skills/create-diagram/SKILL',
  documentation: 'module.documentation/skills/write-manual/SKILL',
  modules: 'platform.core/skills/manage-modules/SKILL',
  'system-content': 'platform.core/skills/maintain-context/SKILL',
  systems: 'module.systems/context/authoring',
  'ui-copy': 'studio/context/writing',
  'contributor-scope': 'platform.core/context/contributor-scope',
  'documentation-standards': 'platform.core/context/documentation-standards',
};
const movedSkills: Record<string, string> = {
  'initialize-studio': 'platform.core/skills/configure-studio',
  'setup-contributor': 'platform.core/skills/setup-contributor',
  'maintain-documentation': 'platform.core/skills/maintain-documentation',
  'setup-design-system': 'module.systems/skills/setup-design-system',
  'document-component': 'module.systems/skills/document-component',
};
const coreDocuments = new Set([
  'checks',
  'source',
  'publishing',
  'fileTypes',
  'diagrams',
  'contracts-and-instructions',
  'assets',
  'stack',
  'agent-context',
  'config',
]);
const ownerPath = (id: string) =>
  (id === 'platform.core' || id.startsWith('module.') ? '/documentation/context/' : '/systems/') + id;
const guidancePath = (target: string) => {
  const [id, ...rest] = target.split('/');
  return ownerPath(id) + (rest.length ? '/' + rest.join('/') : '');
};

export function migratedGuidancePath(path: string): string | null {
  if (path.startsWith('/documentation/context/platform.core/context/technical/'))
    return path.replace('/context/technical/', '/context/');
  if (path.startsWith('/platform/context/technical/'))
    return (
      ownerPath('platform.core') + '/context/' + path.slice('/platform/context/technical/'.length).replace(/\.md$/, '')
    );
  const rule = path.match(/^\/systems\/studio\/rules\/([^/]+?)(?:\.md)?$/);
  if (rule && movedRules[rule[1]]) {
    const target = movedRules[rule[1]];
    return guidancePath(target);
  }
  const skill = path.match(/^\/systems\/studio\/skills\/([^/]+)(\/.*)?$/);
  if (skill && movedSkills[skill[1]])
    return guidancePath(movedSkills[skill[1]]) + (skill[2] ?? '').replace(/\.md$/, '');
  const context = path.match(/^\/systems\/studio\/context\/(principles|personas)(?:\.md)?$/);
  if (context) return ownerPath('platform.core') + '/context/' + context[1];
  if (path === '/systems/marketing/rules/marketing-design' || path === '/systems/marketing/rules/marketing-design.md')
    return ownerPath('marketing') + '/context/design';
  if (path === '/documentation/reference') return ownerPath('platform.core');
  if (path.startsWith('/documentation/reference/')) {
    const result = markdownPath(path.slice('/documentation/reference'.length));
    return result === path.slice('/documentation/reference'.length) ? null : result;
  }
  if (path.startsWith('/knowledge/')) return guidancePath(path.slice('/knowledge/'.length)).replace(/\.md$/, '');
  const oldSystemBrowser = path.match(/^\/documentation\/context\/([^/]+)(\/.*)?$/);
  if (oldSystemBrowser && oldSystemBrowser[1] !== 'platform.core' && !oldSystemBrowser[1].startsWith('module.'))
    return ownerPath(oldSystemBrowser[1]) + (oldSystemBrowser[2] ?? '').replace(/\.md$/, '');
  const system = path.match(/^\/systems\/([^/]+)\/(context|skills)(\/.*)?$/);
  if (system && path.endsWith('.md')) return path.replace(/\.md$/, '');
  return null;
}

// Repository source links and saved reading URLs resolve to the same owner browser.
function sourceMarkdownPath(path: string): string {
  // A system in the supplied root (/platform/systems/studio/context/x.md) is addressed like any system: /systems/studio/context/x.md.
  const supplied = SUPPLIED_SYSTEMS_ROOT.replace(/^src/, '') + '/';
  if (path.startsWith(supplied)) path = '/systems/' + path.slice(supplied.length);
  // A module is addressed by its id wherever its folder is (/platform/modules/canvas/README.md and
  // /modules/research/README.md both read as /modules/<id>/...), so saved links and either root resolve the same way.
  for (const root of MODULE_GLOB_ROOTS)
    if (path.startsWith(root + '/')) path = '/modules/' + path.slice(root.length + 1);
  const moved = migratedGuidancePath(path);
  if (moved) return moved;
  const chapter = path.match(/^\/modules\/documentation\/pages\/([a-z0-9-]+)\.md$/);
  if (chapter) return '/documentation/manual' + (chapter[1] === 'index' ? '' : '/' + chapter[1]);
  const oldCore = path.match(/^\/platform\/core\/([^/]+)\.md$/);
  if (oldCore && coreDocuments.has(oldCore[1]))
    return ownerPath('platform.core') + '/context/' + (oldCore[1] === 'fileTypes' ? 'file-types' : oldCore[1]);
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
  if (contract)
    return (
      ownerPath('module.' + contract[1]) +
      (['prototypes', 'systems'].includes(contract[1]) && contract[2] === 'reference'
        ? ''
        : '/reference/' + contract[2] + '.md')
    );
  return path;
}

// Translate filesystem links at render time. Stored public URLs already carry IDs.
export function markdownPath(path: string, systemIdentities: Readonly<Record<string, string>> = {}): string {
  const target = sourceMarkdownPath(path);
  const parts = /^\/systems\/([^/]+)(.*)$/.exec(target);
  return parts && systemIdentities[parts[1]] ? '/systems/' + systemIdentities[parts[1]] + parts[2] : target;
}
