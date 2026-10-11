import fs from 'node:fs';
import postcss from 'postcss';
import { tailwindThemeProblems, themeInventory, themeAdapter, scopeThemeUtilities } from '../lib/tailwind-theme.js';
import { SYSTEM_SPECS, refreshSystems } from '../../modules/systems/node/systems.js';
import { cssProblems } from '../lib/css-scope.js';
import { scopePolicy } from '../lib/scope.js';
// Fills in the two lists in the app's stylesheet (src/platform/app/styles.css) that depend on what is installed,
// so adding a design system or a module needs no edit to it. CSS can't be given a list at run time, so the stylesheet
// has a marker where each goes and this puts the lines in as the file is read:
//   /* @studio:system-themes */   an @import of each design system's styles/theme.css (in either system root, src/platform/core/roots.ts)
//   /* @studio:data-files */      an @source not for each folder of prototype-shaped folders' meta.json files, which
//                                  Tailwind would otherwise scan for class names and reload the page when they change
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, PROTOTYPE_DIRS } from '../lib/modules.js';
import { PROTOTYPE_SYSTEMS } from '../../modules/systems/node/systems.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const STYLESHEET = path.join(ROOT, 'src', 'platform', 'app', 'styles.css');
export function inventories(deploy = false) {
  return Object.entries(SYSTEM_SPECS)
    .filter(([id, spec]) => CONFIG.systems.includes(id) && (!deploy || spec.status !== 'archived'))
    .map(([id, spec]) => ({
      ...spec,
      inventory: themeInventory(
        fs.readFileSync(path.join(ROOT, spec.dir, 'styles/theme.css'), 'utf8'),
        spec.themeClass,
      ),
    }));
}

const rel = target => path.relative(path.dirname(STYLESHEET), target).split(path.sep).join('/');

function validateThemes() {
  const problems = Object.keys(SYSTEM_SPECS).flatMap(id => {
    const file = path.join(ROOT, SYSTEM_SPECS[id].dir, 'styles/theme.css');
    const code = fs.readFileSync(file, 'utf8');
    return [
      ...(SYSTEM_SPECS[id].role === 'platform'
        ? []
        : cssProblems(code, {
            file,
            themeClass: SYSTEM_SPECS[id].themeClass,
            packagePolicy: scopePolicy({ root: ROOT, systems: PROTOTYPE_SYSTEMS, modules: [] }).packageProblem,
          })),
      ...tailwindThemeProblems(code, { file, ...SYSTEM_SPECS[id] }),
    ];
  });
  if (problems.length) return problems.join('\n');
}

let deploy = false;
export default function css() {
  return {
    name: 'studio-css',
    enforce: 'pre',
    configResolved(config) {
      refreshSystems();
      deploy = config.command === 'build';
    },
    handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.css')) {
        const problem = validateThemes();
        if (problem) this.error(problem);
      }
    },
    transform(code, id) {
      if (path.resolve(id.split('?')[0]) !== STYLESHEET) return null;
      const problem = validateThemes();
      if (problem) this.error(problem);
      for (const system of Object.values(SYSTEM_SPECS))
        this.addWatchFile(path.join(ROOT, system.dir, 'styles/theme.css'));
      const themes = Object.keys(PROTOTYPE_SYSTEMS)
        .filter(id => !deploy || PROTOTYPE_SYSTEMS[id].status !== 'archived')
        .map(id => `@import "${rel(path.join(ROOT, PROTOTYPE_SYSTEMS[id].dir, 'styles', 'theme.css'))}";`)
        .join('\n');
      const sources = ['prototypes', ...PROTOTYPE_DIRS.map(dir => path.basename(dir))]
        .map(name => `@source not "${rel(path.join(ROOT, 'src', name))}/**/meta.json";`)
        .join('\n');
      return {
        code: code
          .replace('/* @studio:tailwind-theme */', themeAdapter(inventories(deploy)))
          .replace('/* @studio:system-themes */', themes)
          .replace('/* @studio:data-files */', sources),
        map: null,
      };
    },
  };
}

export function scopedUtilities() {
  return {
    postcssPlugin: 'studio-system-utilities',
    Once(root) {
      let utilities = false;
      root.walkAtRules('layer', layer => {
        if (layer.params === 'utilities' && layer.nodes) utilities = true;
      });
      if (!utilities) return;
      const scoped = postcss.parse(scopeThemeUtilities(root.toString(), inventories(deploy)), {
        from: root.source?.input.file,
      });
      root.removeAll();
      root.append(scoped.nodes);
    },
  };
}
