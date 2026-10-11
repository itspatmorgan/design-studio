// Resolve instruction links against the file that owns them, before combining
// repository and system entry points for the diagnostic routing map.
import fs from 'node:fs';
import path from 'node:path';
import { MODULE_ROOTS, TEAM_MODULES_ROOT } from '../../../../core/roots.ts';

const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const external = target => /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(target);
const resolve = (file, target) => path.posix.normalize(path.posix.join(path.posix.dirname(file), target));

/** @param {{root: string, systemRoot: string, platform?: boolean, moduleDirs?: string[]}} options */
export function systemInstructions({ root, systemRoot, platform = false, moduleDirs }) {
  const entries = [...(platform ? ['AGENTS.md'] : []), systemRoot + '/AGENTS.md'];
  const exists = file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile();
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const scoped = target =>
    // The platform (including the supplied modules in src/platform/modules), the team's modules, and the system itself.
    target.startsWith('src/platform/') ||
    target.startsWith(`${TEAM_MODULES_ROOT}/`) ||
    target.startsWith(systemRoot + '/');
  const targetOf = (file, target) => (target.startsWith('src/') ? target : resolve(file, target));
  const installed = moduleDirs && new Set(moduleDirs.map(dir => dir.replace(/\/+$/, '')));
  const unavailable = target =>
    installed &&
    MODULE_ROOTS.some(moduleRoot => {
      if (!target.startsWith(moduleRoot + '/')) return false;
      const relative = target.slice(moduleRoot.length + 1);
      if (!relative.includes('/')) return false; // Root READMEs are not module owners.
      const id = relative.split('/')[0];
      return id && !installed.has(`${moduleRoot}/${id}`);
    });
  const agents = entries
    .filter(exists)
    .map(file =>
      read(file).replace(LINK, (match, label, target) => {
        if (external(target)) return match;
        return `[${label}](${targetOf(file, target)})`;
      }),
    )
    .join('\n\n');
  const missing = new Set();
  const visited = new Set();
  const visit = file => {
    if (visited.has(file)) return;
    visited.add(file);
    for (const [, , target] of read(file)
      .replace(/^```[^\n]*\n[\s\S]*?^```.*$/gm, '')
      .replace(/`[^`\n]*`/g, '')
      .matchAll(LINK)) {
      if (external(target)) continue;
      const resolved = targetOf(file, target).split('#')[0];
      // Audit the system's instruction graph, including context and skill references.
      // Platform/module contracts outside this system have their own documentation checks.
      if (!scoped(resolved) || unavailable(resolved)) continue;
      if (!exists(resolved)) {
        missing.add(resolved);
        continue;
      }
      if (resolved.endsWith('.md')) visit(resolved);
    }
  };
  entries.filter(exists).forEach(visit);
  return { agents: agents || null, missing: [...missing].sort() };
}
