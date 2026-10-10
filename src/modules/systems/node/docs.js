// Reads a design system's components folder and works out its component docs
// (src/modules/systems/docs.ts has the rules). Returns the components for the manifest, and the
// problems found, each with the file it is about (a path inside the components folder).
import fs from 'node:fs';
import path from 'node:path';
import { componentProblems, discoverComponents, duplicateProblems } from '../docs.ts';
import { titleOf } from '../scaffold.ts';
import { frontmatter } from '../../../../scripts/lib/frontmatter.js';

// Every file under dir as a "/"-separated path, skipping hidden files and node_modules.
// Links are never followed: a symlink is neither a file nor a folder here.
function filesIn(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.') || e.name === 'node_modules') return [];
    if (e.isDirectory()) return filesIn(path.join(dir, e.name), `${base}${e.name}/`);
    return e.isFile() ? [base + e.name] : [];
  });
}

const stripFrontmatter = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function systemDocs(componentsDir) {
  const read = (file) => fs.readFileSync(path.join(componentsDir, file), 'utf8');
  const found = discoverComponents(filesIn(componentsDir));
  const problems = [];
  const components = found.map((component) => {
    const { source, examples, doc } = component.files;
    const docText = doc ? read(doc) : null;
    const fm = docText ? frontmatter(docText) : null;
    const messages = componentProblems(component, {
      doc: docText === null ? null : { frontmatter: fm, body: stripFrontmatter(docText) },
      examples: examples ? read(examples) : null,
    });
    const file = source ?? doc ?? examples;
    for (const message of messages) problems.push({ file, message });
    return {
      name: component.name, slug: component.slug,
      title: str(fm?.title) || titleOf(component.name), description: str(fm?.description), category: str(fm?.category) || null, docsUrl: str(fm?.docs) || null,
      ...(str(fm?.source) ? { sourceNote: str(fm.source) } : {}),
      files: component.files,
    };
  });
  for (const { component, problem } of duplicateProblems(found)) {
    problems.push({ file: component.files.source ?? component.files.doc ?? component.files.examples, message: problem });
  }
  return { components, problems };
}
