// The changes the app can make to files: create, rename, move, delete, reorder, edit meta.json, and the system content's skills.
// Part of the dev server's file layer (scripts/build/vite-files-plugin.js).
import fs from 'node:fs';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { FILE_TYPES, INSTALLED_FILE_TYPES, fileTypeOf, systemContentTypeOf } from '../../lib/file-types.js';
import { retainedResourceIds, allocateResourceIdentity } from '../../lib/resource-identity-lifecycle.js';
import { STATUSES, parseStatus } from '../../../src/platform/core/archive.ts';
import { afterChange, parentOf, parseOrder, place, withFolderOrder } from '../../../src/platform/core/order.ts';
import { scaffold } from '../../../src/modules/systems/node/scaffold-docs.js';
import { opProblem } from '../../../src/modules/systems/content/rules.ts';
import { SKILL_FILE, descriptionProblem, nameProblem } from '../../../src/modules/systems/content/skills.ts';
import { ROOT, TRASH, readOrder, readTree, resolveInside, validName } from './paths.js';
import { prototypeAddress, repairReferences, snapshotFiles } from '../../lib/artifact-moves.js';
import { prototypeAssignment } from '../../lib/prototype-assignment.js';
import { PROTOTYPE_SYSTEMS } from '../../../src/modules/systems/node/systems.js';

// The contents of a new file: its file type's template, by extension (src/modules/<type>/type.ts).
// Files of no type start empty.
export const templateFor = (name, systemContent = false) => {
  const spec = FILE_TYPES[(systemContent ? systemContentTypeOf : fileTypeOf)(name)];
  return spec?.capabilities.create ? spec.template(name) : '';
};

// The system content's files are platform files: anyone can change their copy here, and the changes go
// through review before they reach everyone. So it's open to whoever runs the app; what it does
// enforce is the system content's shape (src/modules/systems/content/rules.ts).
export const SYSTEM_CONTENT_NOTE = "Knowledge sections (Context, Skills) can't be renamed or deleted.";

// "code-review" → "Code review"
export const titleOf = name => {
  const t = name.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// A skill's new SKILL.md: the frontmatter the Agent Skills format needs, and a start for the body.
// A description that isn't plain text goes in a block, which any YAML reader takes literally.
export function skillTemplate(name, description) {
  const plain = /^[A-Za-z0-9][^:#"'\\\n]*$/.test(description) && !/\s$/.test(description);
  const line = plain ? `description: ${description}` : `description: >\n  ${description.replace(/\s+/g, ' ').trim()}`;
  return `---\nname: ${name}\n${line}\n---\n\nSay what to do, step by step, and when it applies.\n`;
}

// Moves a file or folder to the Trash with macOS's built-in trash command, or, where
// there isn't one, into .trash/ at the repo root (ignored by Git).
export function trash(file) {
  if (fs.existsSync('/usr/bin/trash')) {
    try {
      execFileSync('/usr/bin/trash', [file]);
      return 'the Trash';
    } catch {
      /* fall back */
    }
  }
  fs.mkdirSync(TRASH, { recursive: true });
  fs.renameSync(file, path.join(TRASH, `${Date.now()}-${path.basename(file)}`));
  return '.trash/';
}

// Keeps meta.json "order" in step when a file or folder is renamed (toRel is its new path), or moves
// or is deleted (toRel is null: a moved file lands after the arranged ones in its new folder).
export function fixOrder(dir, fromRel, toRel) {
  const metaFile = path.join(dir, 'meta.json');
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  } catch {
    return;
  }
  const order = parseOrder(meta.order);
  if (!order) return;
  const next = afterChange(order, fromRel, toRel);
  if (next.length === order.length && next.every((p, i) => p === order[i])) return;
  if (next.length) meta.order = next;
  else delete meta.order;
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
}

// Sets `name:` in a SKILL.md's frontmatter (adding it if it's missing), leaving the rest as it is.
export function renameSkillInFile(file, name) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return;
  const lines = block[1].split(/\r?\n/);
  const at = lines.findIndex(l => /^name:/.test(l));
  if (at >= 0) lines[at] = `name: ${name}`;
  else lines.unshift(`name: ${name}`);
  fs.writeFileSync(file, text.replace(block[1], lines.join('\n')));
}

// One file operation. Returns { path } (the new path, for create, rename, and move) or throws a message.
// `section` is the system content section the folder is (context, skills), or null for a prototype.
export function runOp(
  dir,
  { op, path: rel = '', name, dir: isDir, to, before, title, description, status },
  section = null,
) {
  const inside = r => resolveInside(dir, r);
  const relOf = abs => path.relative(fs.realpathSync(dir), abs).split(path.sep).join('/');
  // The system content has a fixed shape: check the change against it first (src/modules/systems/content/rules.ts).
  if (section) {
    if (op === 'create-skill') {
      if (section !== 'skills') throw new Error('Skills are made in the Skills tab.');
      const bad = nameProblem(name)
        ? `A skill's name ${nameProblem(name)}`
        : descriptionProblem(description)
          ? `The description ${descriptionProblem(description)}`
          : null;
      if (bad) throw new Error(bad);
      if (/[\r\n]/.test(name)) throw new Error("A skill's name is one word or several joined by hyphens.");
      const folder = path.join(dir, name);
      if (fs.existsSync(folder)) throw new Error(`A skill named “${name}” already exists.`);
      fs.mkdirSync(folder);
      fs.writeFileSync(path.join(folder, SKILL_FILE), skillTemplate(name, description));
      return { path: `${name}/${SKILL_FILE}` };
    }
    const target = op === 'create' ? null : inside(rel);
    // A Markdown file keeps its .md: rename to "notes" and it's "notes.md", like a new file.
    if (
      op === 'rename' &&
      section === 'context' &&
      target &&
      fs.statSync(target).isFile() &&
      typeof name === 'string' &&
      !name.endsWith('.md')
    )
      name += '.md';
    const problem = opProblem(
      section,
      { op, path: rel, name, to, dir: isDir },
      Boolean(target && fs.statSync(target).isDirectory()),
    );
    if (problem) throw new Error(problem);
  }
  if (op === 'create') {
    const parent = inside(rel);
    if (!parent || !fs.statSync(parent).isDirectory()) throw new Error('That folder was moved or deleted.');
    if (!validName(name)) throw new Error("Names can't contain slashes or start with a dot.");
    const target = path.join(parent, name);
    if (fs.existsSync(target)) throw new Error(`Something named “${name}” already exists here.`);
    if (isDir) fs.mkdirSync(target);
    else {
      let source = templateFor(name, Boolean(section));
      const type = FILE_TYPES[fileTypeOf(name)];
      if (!section && ![...rel.split('/'), name].some(part => part.startsWith('_')) && type?.inPrototype) {
        if (!type.identity) throw new Error('This artifact file type needs an identity adapter.');
        source = type.identity.write(source, allocateResourceIdentity(retainedResourceIds(ROOT, INSTALLED_FILE_TYPES)));
      }
      fs.writeFileSync(target, source, { flag: 'wx' });
    }
    return { path: relOf(target) };
  }
  if (op === 'meta') {
    // Only the fields given change; others in meta.json (created, systemId) are kept.
    const metaFile = path.join(dir, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) throw new Error('The prototype needs a title.');
      meta.title = title.trim();
    }
    // status: active (the default, so it's not written) or archived.
    if (status !== undefined) {
      const next = parseStatus(status);
      if (!next) throw new Error(`A status is one of: ${STATUSES.join(', ')}.`);
      if (next === 'active') {
        const assignment = prototypeAssignment(meta, PROTOTYPE_SYSTEMS);
        if (assignment.problems.length || meta.systemMissing)
          throw new Error('Rebuild this prototype with an available system before restoring it.');
        if (assignment.system !== null && PROTOTYPE_SYSTEMS[assignment.system]?.status === 'archived')
          throw new Error('Restore this prototype’s system before restoring the prototype.');
      }
      if (next === 'active') {
        delete meta.status;
        delete meta.archivedBySystemId;
      } else meta.status = next;
    }
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
    return {};
  }
  if (op === 'reorder') {
    // Arranging is for prototypes: the system content has a fixed shape (src/modules/systems/content/rules.ts).
    if (section) throw new Error('System sections keep their own order.');
    const from = inside(rel);
    if (!from || from === fs.realpathSync(dir) || rel === 'meta.json')
      throw new Error('That file was moved or deleted.');
    let current = rel;
    let movedPaths = [];
    let relinkedFiles = [];
    if (typeof to === 'string' && to !== parentOf(rel)) {
      const moved = runOp(dir, { op: 'move', path: rel, to });
      current = moved.path;
      movedPaths = moved.movedPaths ?? [];
      relinkedFiles = moved.relinkedFiles ?? [];
    }
    const folder = parentOf(current);
    const where = inside(folder);
    if (!where || !fs.statSync(where).isDirectory()) throw new Error('That folder was moved or deleted.');
    const siblings = readTree(where, folder ? `${folder}/` : '', readOrder(dir)).map(n => n.path);
    if (!siblings.includes(current)) throw new Error('That file was moved or deleted.');
    if (before && !siblings.includes(before)) throw new Error('That place was moved or deleted.');
    const metaFile = path.join(dir, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    meta.order = withFolderOrder(parseOrder(meta.order) ?? [], folder, place(siblings, current, before ?? ''));
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
    return { path: current, movedPaths, relinkedFiles };
  }
  const source = inside(rel);
  if (!source || source === fs.realpathSync(dir)) throw new Error('That file was moved or deleted.');
  if (rel === 'meta.json')
    throw new Error("meta.json holds the prototype's info, so it stays put. To change the title, choose Edit.");
  if (op === 'rename' || op === 'move') {
    let target;
    if (op === 'rename') {
      if (!validName(name)) throw new Error("Names can't contain slashes or start with a dot.");
      target = path.join(path.dirname(source), name);
    } else {
      const folder = inside(to ?? '');
      if (!folder || !fs.statSync(folder).isDirectory()) throw new Error('That folder was moved or deleted.');
      if (folder === source || folder.startsWith(source + path.sep))
        throw new Error("A folder can't move inside itself.");
      target = path.join(folder, path.basename(source));
    }
    if (target === source) return { path: rel };
    if (fs.existsSync(target)) throw new Error(`Something named “${path.basename(target)}” already exists there.`);
    const beforeMove = section ? null : snapshotFiles(dir);
    fs.renameSync(source, target);
    const next = relOf(target);
    let movedPaths = [];
    let relinkedFiles = [];
    try {
      if (beforeMove) {
        const repaired = repairReferences(dir, beforeMove, snapshotFiles(dir), prototypeAddress(dir));
        movedPaths = [...repaired.moves];
        relinkedFiles = repaired.changes.map(change => relOf(change.file));
      }
    } catch (error) {
      fs.renameSync(target, source);
      throw error;
    }
    // A skill's name is its folder's name: keep the two together.
    if (section === 'skills' && op === 'rename' && !rel.includes('/'))
      renameSkillInFile(path.join(target, SKILL_FILE), path.basename(target));
    fixOrder(dir, rel, op === 'rename' ? next : null);
    return { path: next, movedPaths, relinkedFiles };
  }
  if (op === 'delete') {
    const where = trash(source);
    fixOrder(dir, rel, null);
    return { trashedTo: where };
  }
  throw new Error(`Unknown operation: ${op}`);
}

// The one operation a prototype system's components have (see the header). Anything else, like
// adding, renaming, or deleting a component, is done in the files: it would break the prototypes using it.
export function runSystemOp(system, { op, component }) {
  if (op === 'add-docs') {
    if (typeof component !== 'string') throw new Error('Say which component.');
    scaffold(system, component);
    return {};
  }
  throw new Error('Components are added and changed in their files: edit them in the Source view, or ask your agent.');
}

// Show a file in the system file browser.
export function reveal(file) {
  const run = promisify(execFile);
  if (process.platform === 'darwin') return run('/usr/bin/open', ['-R', file], { timeout: 5000 });
  if (process.platform === 'win32') return run('explorer', [`/select,${file}`], { timeout: 5000 });
  return run('xdg-open', [fs.statSync(file).isDirectory() ? file : path.dirname(file)], { timeout: 5000 });
}
