// Canonical knowledge owners and portable, project-local skill exposure.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { frontmatter } from './frontmatter.js';
import { skillProblems } from '../../../modules/systems/content/skills.ts';
import { canonicalDirectory } from './safe-paths.js';

// `systems` is the discovered systems (SYSTEM_SPECS or SYSTEM_SOURCES), each with the `dir` it was found in.
export function knowledgeOwners(modules, systems) {
  return [
    { id: 'platform.core', kind: 'platform', label: 'Platform', root: 'src/platform' },
    ...modules.map(m => ({ id: `module.${m.id}`, kind: 'module', label: m.label, root: `src/modules/${m.id}` })),
    ...Object.entries(systems).map(([id, s]) => ({
      id,
      kind: 'system',
      label: s.label ?? id,
      root: s.dir.replace(/\/$/, ''), // the folder it was found in, in either system root
    })),
  ];
}

export function skillCatalog(root, owners) {
  return owners.flatMap(owner => {
    const dir = path.join(root, owner.root, 'skills');
    if (!fs.existsSync(dir)) return [];
    if (!canonicalDirectory(dir, root)) throw new Error(`${dir}: skill directory must stay inside the repository.`);
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.'))
      .map(e => {
        const folder = path.join(dir, e.name);
        if (!e.isDirectory() || !canonicalDirectory(folder, root))
          throw new Error(`${folder}: a canonical skill must be an ordinary folder.`);
        const entry = path.join(folder, 'SKILL.md');
        if (!fs.existsSync(entry) || !fs.lstatSync(entry).isFile())
          throw new Error(`${entry}: skill entry must be an ordinary file.`);
        const fm = frontmatter(fs.readFileSync(entry, 'utf8'));
        const problems = skillProblems(e.name, fm);
        if (problems.length) throw new Error(problems.join('\n'));
        const name = `studio-${owner.kind}-${owner.kind === 'platform' ? '' : owner.id.replace(/^module\./, '') + '-'}${fm.name}`;
        if (!/^[a-z0-9-]+$/.test(name))
          throw new Error(`${entry}: exposed names must use lowercase letters, digits, and hyphens.`);
        if (name.length > 64) throw new Error(`${entry}: exposed name ${name} exceeds 64 characters.`);
        return {
          owner,
          folder: e.name,
          name,
          description: String(fm.description),
          source: `${owner.root}/skills/${e.name}/SKILL.md`,
        };
      });
  });
}
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const safeParent = (dir, root) => {
  if (path.relative(root, dir).startsWith('..')) return false;
  let ancestor = dir;
  while (!exists(ancestor)) {
    if (ancestor === root) return false;
    ancestor = path.dirname(ancestor);
  }
  return Boolean(canonicalDirectory(ancestor, root));
};
const exists = file => {
  try {
    return fs.lstatSync(file);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
};

// Manage only exact generated entries. Modified, colliding, and unrelated files are preserved.
export function syncSkillAdapters(root, catalog, { check = false } = {}) {
  // Migrate the starter's known, dangling legacy adapters without following or deleting their targets.
  for (const rel of ['.agents/skills', '.claude/skills']) {
    const abs = path.join(root, rel);
    if (!canonicalDirectory(path.dirname(abs), root)) {
      if (exists(path.dirname(abs))) throw new Error(`${rel}: unsafe adapter parent.`);
    }
    if (
      exists(abs)?.isSymbolicLink() &&
      fs.readlinkSync(abs) === '../src/systems/platform/skills' &&
      !fs.existsSync(abs)
    ) {
      if (check) throw new Error(`${rel}: legacy adapter needs synchronization.`);
      fs.unlinkSync(abs);
    }
  }
  const receiptPath = path.join(root, '.agents/studio-skills.json');
  for (const dir of ['.agents', '.agents/skills', '.claude', '.claude/skills']) {
    const abs = path.join(root, dir);
    if (!safeParent(abs, root))
      throw new Error(`${dir}: adapter directory cannot leave the repository or use symlinked parents.`);
  }
  if (exists(receiptPath)?.isSymbolicLink()) throw new Error('The skill adapter receipt must be an ordinary file.');
  const previous = exists(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, 'utf8')) : { schema: 1, files: {} };
  if (previous.schema !== 1 || !previous.files || typeof previous.files !== 'object' || Array.isArray(previous.files))
    throw new Error('Invalid skill adapter receipt.');
  const files = {},
    warnings = [],
    operations = [];
  const desired = new Map();
  for (const skill of catalog) {
    const base = `.agents/skills/${skill.name}`;
    const source = path.posix.relative(base, skill.source);
    const system =
      skill.owner.kind === 'system'
        ? `Use this skill only for explicitly requested maintenance of ${skill.owner.label} or prototypes assigned to system ${skill.owner.id}. Resolve metadata first; the browser selection is irrelevant.\n\n`
        : '';
    const module =
      skill.owner.kind === 'module'
        ? `Confirm module ${skill.owner.id.slice(7)} is enabled before using this capability.\n\n`
        : '';
    const text = `---\nname: ${skill.name}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n<!-- studio:generated-skill -->\nRead this repository's AGENTS.md and required working context.\n\n${system}${module}Follow the [canonical ${skill.folder} skill](${source}), resolving its references relative to its canonical folder. Supporting scripts and assets remain there. This generated entry has no independent procedure.\n`;
    const entry = `${base}/SKILL.md`;
    if (desired.has(entry)) throw new Error(`Duplicate exposed skill ${skill.name}.`);
    desired.set(entry, { kind: 'file', content: text });
    desired.set(`.claude/skills/${skill.name}`, { kind: 'link', content: `../../.agents/skills/${skill.name}` });
  }
  const current = (rel, kind) => {
    const file = path.join(root, rel),
      stat = exists(file);
    if (!stat) return null;
    if (kind === 'link') return stat.isSymbolicLink() ? fs.readlinkSync(file) : undefined;
    return stat.isFile() && !stat.isSymbolicLink() ? fs.readFileSync(file, 'utf8') : undefined;
  };
  const managedPath = rel =>
    /^\.agents\/skills\/studio-[a-z0-9-]+\/SKILL\.md$|^\.claude\/skills\/studio-[a-z0-9-]+$/.test(rel);
  const blocked = new Set();
  for (const [rel, spec] of desired) {
    if (spec.kind === 'link' && blocked.has(rel.replace('.claude/', '.agents/') + '/SKILL.md')) {
      warnings.push(`Skipped Claude exposure for a colliding adapter ${rel}.`);
      continue;
    }
    const abs = path.join(root, rel);
    const parent = spec.kind === 'file' ? path.dirname(abs) : path.dirname(abs);
    if (!safeParent(parent, root)) throw new Error(`${rel}: unsafe adapter parent.`);
    const before = current(rel, spec.kind),
      old = previous.files?.[rel];
    if (
      before !== null &&
      (before === undefined ||
        (before !== spec.content && (!old || old.kind !== spec.kind || hash(before) !== old.hash)))
    ) {
      warnings.push(`Preserved user-owned or modified adapter ${rel}.`);
      blocked.add(rel);
      continue;
    }
    if (spec.kind === 'file' && exists(path.dirname(abs)) && !old && before === null) {
      warnings.push(`Preserved existing skill folder ${path.dirname(rel)}.`);
      blocked.add(rel);
      continue;
    }
    files[rel] = { kind: spec.kind, hash: hash(spec.content) };
    if (before !== spec.content) operations.push({ rel, ...spec });
  }
  for (const [rel, old] of Object.entries(previous.files ?? {})) {
    if (!managedPath(rel) || !['file', 'link'].includes(old.kind))
      throw new Error('Invalid skill adapter receipt entry.');
    if (desired.has(rel)) continue;
    if (!safeParent(path.dirname(path.join(root, rel)), root))
      throw new Error(`${rel}: unsafe obsolete adapter parent.`);
    const before = current(rel, old.kind);
    if (before === null) continue;
    if (before === undefined || hash(before) !== old.hash) {
      warnings.push(`Preserved modified obsolete adapter ${rel}.`);
      continue;
    }
    operations.push({ rel, kind: 'remove' });
  }
  const receipt = JSON.stringify({ schema: 1, files }, null, 2) + '\n';
  const receiptChanged = !exists(receiptPath) || fs.readFileSync(receiptPath, 'utf8') !== receipt;
  const claude = path.join(root, 'CLAUDE.md');
  if (check) return { changed: operations.length + Number(receiptChanged) + Number(!exists(claude)), warnings };
  // All collision and path checks finish before writes.
  for (const op of operations) {
    const abs = path.join(root, op.rel);
    if (op.kind === 'remove') {
      fs.unlinkSync(abs);
      if (op.rel.endsWith('/SKILL.md') && !fs.readdirSync(path.dirname(abs)).length) fs.rmdirSync(path.dirname(abs));
    } else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      if (op.kind === 'link') {
        if (exists(abs)) fs.unlinkSync(abs);
        fs.symlinkSync(op.content, abs, 'dir');
      } else fs.writeFileSync(abs, op.content);
    }
  }
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  if (receiptChanged) fs.writeFileSync(receiptPath, receipt);
  if (!exists(claude)) fs.writeFileSync(claude, '@AGENTS.md\n');
  return { changed: operations.length, warnings };
}
