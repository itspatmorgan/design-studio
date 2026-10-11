import path from 'node:path';
import { modulePlatformProblem } from '../../src/platform/core/modules/boundaries.ts';
import { fileURLToPath } from 'node:url';
import { PROTOTYPE_SYSTEMS, DEFAULT_SYSTEM } from '../../src/modules/systems/node/systems.js';
import { ENABLED_MODULES, PROTOTYPE_DIRS } from '../lib/modules.js';
import { scopePolicy } from '../lib/scope.js';
import { importsOf } from '../lib/imports.js';
import { cssProblems } from '../lib/css-scope.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export default function importGuard({
  root = ROOT,
  systems = PROTOTYPE_SYSTEMS,
  defaultSystem = DEFAULT_SYSTEM,
  modules = ENABLED_MODULES,
  prototypeDirs = PROTOTYPE_DIRS,
} = {}) {
  const policy = scopePolicy({ root, systems, defaultSystem, modules, prototypeDirs });
  return {
    name: 'prototype-import-guard',
    enforce: 'pre',
    configResolved() {},
    async resolveId(source, importer, options) {
      if (!importer || importer.includes('\0')) return null;
      const file = importer.split('?')[0];
      const dependencyProblem = policy.packageProblem(source, file);
      if (dependencyProblem) this.error(dependencyProblem);
      // Theme imports are recursively validated by the CSS plugin before loading.
      if (/\.css$/.test(file) && !/\.module\.css$/.test(file)) return null;
      const scope = policy.scopeOf(file);
      if (!scope && !path.relative(root, file).startsWith('src/modules/')) return null;
      if (scope && /\.css($|\?)/.test(source) && !/\.module\.css($|\?)/.test(source))
        this.error(
          `${scope.kind} scope: ${file} imports global CSS. Use CSS Modules for runtime styles; design-system themes are loaded by the platform.`,
        );
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved || resolved.external || !path.isAbsolute(resolved.id)) return resolved;
      const platformProblem = modulePlatformProblem(
        path.relative(root, file).replaceAll(path.sep, '/'),
        path.relative(root, resolved.id.split('?')[0]).replaceAll(path.sep, '/'),
        resolved.id.includes('?raw'),
      );
      if (platformProblem) this.error(platformProblem);
      const problem = policy.problem(source, file, resolved.id.split('?')[0]);
      if (problem) this.error(problem);
      return resolved;
    },
    transform(code, id) {
      const file = id.split('?')[0];
      if (/\.[cm]?[jt]sx?$/.test(file))
        for (const { source } of importsOf(code, file)) {
          const problem = policy.packageProblem(source, file);
          if (problem) this.error(problem);
        }
      const scope = policy.scopeOf(file);
      if (!scope && !path.relative(root, file).startsWith('src/modules/')) return null;
      if (scope && /\.module\.css$/.test(file)) {
        const problems = cssProblems(code, { file, mode: 'module' });
        if (problems.length) this.error(problems.join('\n'));
      } else if (/\.[cm]?[jt]sx?$/.test(file) && importsOf(code, file).some(i => !i.typeOnly && i.source === null)) {
        this.error(
          `${scope?.kind ?? 'Module'} scope: computed imports in ${file} cannot be checked. Use literal import paths.`,
        );
      }
      return null;
    },
  };
}
