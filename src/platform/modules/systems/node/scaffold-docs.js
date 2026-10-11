// Usage: node src/platform/modules/systems/node/scaffold-docs.js <system> [component]
// Adds the docs files a component is missing (<name>.examples.tsx and <name>.md, next to its
// component file), or for every component in the system when none is named. Files that exist are
// never touched. See src/platform/modules/systems/docs.ts for how the files make a page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_SOURCES } from './systems.js';
import { docTemplates } from '../scaffold.ts';
import { systemDocs } from './docs.js';
import { extractProps } from './extract-props.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

// The component's main export and its required props, read from its code; null if it has none.
function mainExport(source, stem) {
  const found = extractProps([source], ROOT)[source] ?? [];
  const wanted = stem.replace(/[-_\s]/g, '').toLowerCase();
  const main = found.find(c => c.name.toLowerCase() === wanted) ?? found[0];
  return (
    main && { name: main.name, required: main.props.filter(p => p.required).map(({ name, type }) => ({ name, type })) }
  );
}

// A flat component (button.tsx) goes into a folder of its own with the files that share its name
// (button/button.tsx, button.md, button.examples.tsx) and an index.ts that re-exports it, so it's still imported
// as .../components/button. Does nothing if it's already in a folder or the folder is taken. Returns the
// component with its files' new paths, and what it moved.
function tidy(dir, c) {
  const stem = path.basename(c.files.source).replace(/\.[jt]sx$/, '');
  if (c.files.source.includes('/') || !/^[A-Za-z0-9_-]+$/.test(stem) || fs.existsSync(path.join(dir, stem)))
    return { c, moved: [] };
  fs.mkdirSync(path.join(dir, stem));
  const files = { ...c.files };
  const moved = [];
  for (const kind of ['source', 'examples', 'doc']) {
    const file = files[kind];
    if (!file || file.includes('/')) continue; // only the flat files that sit next to the component
    fs.renameSync(path.join(dir, file), path.join(dir, stem, file));
    files[kind] = `${stem}/${file}`;
    moved.push(`${stem}/${file}`);
  }
  fs.writeFileSync(path.join(dir, stem, 'index.ts'), `export * from './${stem}';\n`, { flag: 'wx' });
  moved.push(`${stem}/index.ts`);
  return { c: { ...c, files }, moved };
}

// Returns the files it wrote, relative to the repo; the files it moved into folders are added to `moved`. Throws with a message for a bad system or component.
export function scaffold(system, only, moved = []) {
  const sys = Object.hasOwn(SYSTEM_SOURCES, system) ? SYSTEM_SOURCES[system] : null;
  if (!sys) throw new Error(`"${system}" isn't a system. The systems are: ${Object.keys(SYSTEM_SOURCES).join(', ')}.`);
  const dir = path.join(ROOT, sys.components);
  const all = systemDocs(dir).components;
  const targets = only
    ? all.filter(c => c.slug === only.toLowerCase() || c.name.toLowerCase() === only.toLowerCase())
    : all;
  if (only && !targets.length)
    throw new Error(
      `No component named "${only}" in ${sys.components}/. It needs a component file first (for example, npx shadcn add ${only}).`,
    );
  const written = [];
  for (const target of targets) {
    if (!target.files.source) continue; // docs only (the components come from elsewhere): nothing to base them on
    const tidied = tidy(dir, target);
    const c = tidied.c;
    for (const file of tidied.moved) moved.push(path.join(sys.components, file));
    const stem = path.basename(c.files.source).replace(/\.[jt]sx$/, '');
    const exported = mainExport(path.join(dir, c.files.source), stem);
    const templates = docTemplates({
      system,
      source: c.files.source,
      exportName: exported?.name,
      required: exported?.required,
    });
    for (const [kind, file] of [
      ['examples', templates.examples],
      ['doc', templates.doc],
    ]) {
      if (c.files[kind]) continue;
      try {
        fs.writeFileSync(path.join(dir, file.file), file.content, { flag: 'wx' });
        written.push(path.relative(ROOT, path.join(dir, file.file)));
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
      }
    }
  }
  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [system, component] = process.argv.slice(2);
  if (!system) {
    console.error(
      'Usage: pnpm component-docs <system> [component]   (for example: pnpm component-docs product button)',
    );
    process.exit(1);
  }
  try {
    const moved = [];
    const written = scaffold(system, component, moved);
    if (!written.length && !moved.length)
      console.log('Nothing to add: every component already has its examples and page, in a folder of its own.');
    for (const file of moved) console.log(`Moved ${file}`);
    for (const file of written) console.log(`Created ${file}`);
    if (written.length) console.log('Fill in each description, "When to use", and example, then run pnpm build.');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
