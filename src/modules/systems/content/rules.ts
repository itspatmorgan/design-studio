// What can be made, renamed, moved, and deleted in the system content (src/systems/<id>/), which has a fixed
// shape (src/modules/systems/content/node/content-check.js). The file layer checks every change with these, and the
// navigation uses them to offer only what fits. Paths are inside a section, like "review/SKILL.md"
// in skills. This file has no imports beyond skills.ts, so Node scripts can load it directly.
import { SKILL_FILE, nameProblem } from './skills.ts';

// What "New" can make in a folder.
export type NewKind = 'document' | 'folder' | 'skill' | 'file';

const depth = (path: string) => (path ? path.split('/').length : 0);
const base = (path: string) => path.split('/').at(-1) ?? '';

// Context documents are Markdown files in folders; skills are folders with a SKILL.md and anything else in them.
const isMarkdown = (section: string) => section === 'context';

// What can be made in `folder` ('' is the top of the section).
export function creatableIn(section: string, folder: string): NewKind[] {
  if (isMarkdown(section)) return ['document', 'folder'];
  return folder === '' ? ['skill'] : ['file', 'folder'];
}

// The SKILL.md of a skill: it can't be renamed, moved, or deleted alone, or the skill disappears.
export const isSkillFile = (section: string, path: string) =>
  section === 'skills' && depth(path) === 2 && base(path) === SKILL_FILE;
// A skill's folder: a direct child of skills/.
export const isSkillFolder = (section: string, path: string, isDir: boolean) =>
  section === 'skills' && isDir && depth(path) === 1;

// A change to a file or folder, as the file layer receives it. `path` is the file or folder it is about.
export type SystemContentOp = { op: string; path?: string; name?: string; to?: string; dir?: boolean };

// Why a change isn't allowed in a section, as a sentence that says what to do instead, or null if it is.
// `isDir` is whether the file or folder the change is about (`path`) is a folder.
export function opProblem(section: string, c: SystemContentOp, isDir: boolean): string | null {
  const path = c.path ?? '';
  if (c.op === 'meta') return 'System sections do not use prototype metadata.';
  if (c.op === 'create') {
    if (!creatableIn(section, path).includes(c.dir ? 'folder' : isMarkdown(section) ? 'document' : 'file')) {
      return section === 'skills' && path === ''
        ? 'A skill is made with New skill. It has to be a folder with a SKILL.md.'
        : "That can't be made here.";
    }
    if (isMarkdown(section) && !c.dir && !(c.name ?? '').endsWith('.md'))
      return 'Context documents are Markdown files, and end in .md.';
    return null;
  }
  if (isSkillFile(section, path)) {
    return c.op === 'rename'
      ? `${SKILL_FILE} has to keep its name: it's how agents find the skill.`
      : c.op === 'move'
        ? `${SKILL_FILE} has to stay in its skill's folder.`
        : `A skill needs its ${SKILL_FILE}. To remove the skill, delete its folder.`;
  }
  if (c.op === 'rename') {
    if (isSkillFolder(section, path, isDir)) {
      const problem = nameProblem(c.name);
      return problem ? `A skill's name ${problem}` : null;
    }
    if (isMarkdown(section) && !isDir && !(c.name ?? '').endsWith('.md'))
      return 'Context documents are Markdown files, and end in .md.';
    return null;
  }
  if (c.op === 'move') {
    if (isSkillFolder(section, path, isDir)) return "A skill's folder stays in skills/. Rename it, or delete it.";
    if (section === 'skills' && (c.to ?? '') === '') return "Files in skills/ live inside a skill's folder.";
    return null;
  }
  return null;
}
