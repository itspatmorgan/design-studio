// Gives each file type's loader (src/modules/<type>/loader.ts) the list of files it opens, and
// leaves archived prototypes and views out of the production build (src/platform/core/archive.ts).
//
// Vite needs a glob written out literally, so a loader says import.meta.glob(['/__studio_globs__/*']), a placeholder
// that is a valid glob (it matches nothing, so Vite's dependency scan, which reads the file before this runs,
// is satisfied), and this puts the patterns in its place as the file is read: the type's extensions in every folder that holds items, which come from
// the modules' sections (src/platform/core/modules/globs.ts). In a production build it adds a negated pattern
// for each archived file, prototype, or system, so those never become chunks. Dev can show archived work;
// prototypes waiting to replace a deleted system cannot load in either environment. The deployed manifest
// leaves the same things out (scripts/build/build-manifest.js --deploy).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_SPECS } from '../../src/modules/systems/node/systems.js';
import { unavailablePrototypeRoots } from '../lib/system-lifecycle.js';
import { buildManifest } from './build-manifest.js';
import { FILE_TYPES } from '../lib/file-types.js';
import { ENABLED_MODULES } from '../lib/modules.js';
import { globsFor } from '../../src/platform/core/modules/globs.ts';

// A path as a literal glob: characters that mean something to a glob are escaped. A trailing /**
// (a whole prototype) is kept.
function literal(glob) {
  const escape = s => s.replace(/[\\()[\]{}*?!+@|]/g, '\\$&');
  return glob.endsWith('/**') ? `${escape(glob.slice(0, -3))}/**` : escape(glob);
}

const LOADER = /[\\/]modules[\\/]([^\\/]+)[\\/]loader\.ts$/;
const MACRO = /\['\/__studio_globs__\/\*'\]/g;

export default function globs() {
  let isBuild = false;
  let negations = [];
  let replaced = 0;
  let systemNegations = [];
  const root = fileURLToPath(new URL('../../', import.meta.url));
  return {
    name: 'studio-globs',
    enforce: 'pre',
    configResolved(c) {
      isBuild = c.command === 'build';
    },
    buildStart() {
      replaced = 0;
      negations = unavailablePrototypeRoots(root).map(
        dir => `!/${path.relative(path.join(root, 'src'), dir).split(path.sep).join('/')}/**`,
      );
      systemNegations = isBuild
        ? Object.entries(SYSTEM_SPECS)
            .filter(([, spec]) => spec.status === 'archived')
            .map(([id]) => `!/systems/${id}/**`)
        : [];
      if (!isBuild) return;
      const { archived } = buildManifest({ deploy: true, write: false, quiet: true });
      negations.push(...archived.map(glob => `!${literal(glob)}`));
    },
    transform(code, id) {
      let updated = false;
      if (systemNegations.length)
        code = code.replace(
          /(import\.meta\.glob(?:<[^\n]+?>)?\()(\[[^\]]+\]|'[^']+'|"[^"]+")/g,
          (whole, lead, patterns) => {
            if (!patterns.includes('/systems/')) return whole;
            updated = true;
            const list = patterns.startsWith('[') ? patterns.slice(1, -1) : patterns;
            return lead + '[' + list + ',' + systemNegations.map(value => JSON.stringify(value)).join(',') + ']';
          },
        );
      if (/[\\/]app[\\/]docs[\\/]loadReference\.ts$/.test(id.split('?')[0])) {
        const references = ['/platform/README.md', ...ENABLED_MODULES.map(m => `/modules/${m.id}/*.md`)];
        return { code: code.replace("['/__studio_references__/*']", JSON.stringify(references)), map: null };
      }
      const match = LOADER.exec(id.split('?')[0]);
      if (!match || !code.includes("'/__studio_globs__/*'")) return updated ? { code, map: null } : null;
      // A type that is turned off is still bundled (the app reads every type's folder and keeps the ones that are on), so
      // its loader gets an empty list: it opens nothing.
      const list = JSON.stringify(
        FILE_TYPES[match[1]]
          ? [...globsFor(match[1], FILE_TYPES, ENABLED_MODULES), ...negations, ...systemNegations]
          : [],
      );
      replaced++;
      return { code: code.replace(MACRO, list), map: null };
    },
    // Archived files that no loader was told about would ship in the build, so stop instead.
    buildEnd() {
      if (negations.length && replaced === 0) {
        this.error(
          "Archived views and prototypes could not be left out of the build: no file type loader (src/modules/<type>/loader.ts) lists its files with the ['/__studio_globs__/*'] placeholder.",
        );
      }
    },
  };
}
