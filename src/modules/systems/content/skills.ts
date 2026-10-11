// The Agent Skills format (https://agentskills.io/specification): a skill is a folder with a
// SKILL.md that starts with frontmatter. These are the spec's rules for that frontmatter, checked
// when the app is built and used when the app makes a skill. This file has no imports, so Node
// scripts can load it directly.

export const SKILL_FILE = 'SKILL.md';

// A skill's page title, from its name: "document-component" → "Document component".
export function skillTitle(name: string): string {
  const words = name.replace(/-+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
export const NAME_MAX = 64;
export const DESCRIPTION_MAX = 1024;
export const COMPATIBILITY_MAX = 500;

// Lowercase letters and numbers in words joined by single hyphens: no leading, trailing, or
// doubled hyphen.
const NAME = /^[\p{Ll}\p{Nd}]+(-[\p{Ll}\p{Nd}]+)*$/u;

// Why a skill's name (which is also its folder's name) isn't valid, or null if it is.
export function nameProblem(name: unknown): string | null {
  if (typeof name !== 'string' || !name) return 'is missing.';
  if (name.length > NAME_MAX) return `is too long: names are at most ${NAME_MAX} characters.`;
  if (!NAME.test(name))
    return "can use only lowercase letters, numbers, and single hyphens, and can't start or end with a hyphen.";
  return null;
}

// Why a skill's description isn't valid, or null if it is.
export function descriptionProblem(description: unknown): string | null {
  if (typeof description !== 'string' || !description.trim())
    return 'is missing: say what the skill does and when to use it.';
  if (description.length > DESCRIPTION_MAX)
    return `is too long: descriptions are at most ${DESCRIPTION_MAX} characters.`;
  return null;
}

// Problems with a skill, each a sentence that says what to fix. `folder` is the skill's folder name;
// `frontmatter` is SKILL.md's leading block as key/value pairs, or null when there isn't one.
export function skillProblems(folder: string, frontmatter: Record<string, unknown> | null): string[] {
  const problems: string[] = [];
  const at = `skills/${folder}/${SKILL_FILE}`;
  if (!frontmatter)
    return [
      `${at} has to start with frontmatter (a block between --- lines) holding the skill's name and description.`,
    ];
  const folderProblem = nameProblem(folder);
  if (folderProblem) problems.push(`The skill folder "${folder}" ${folderProblem}`);
  const name = frontmatter.name === undefined ? undefined : String(frontmatter.name);
  const fromName = nameProblem(name);
  if (fromName) problems.push(`The "name" in ${at} ${fromName}`);
  else if (name !== folder)
    problems.push(`The "name" in ${at} is "${name}", but the folder is "${folder}". They have to match.`);
  const fromDescription = descriptionProblem(frontmatter.description);
  if (fromDescription) problems.push(`The "description" in ${at} ${fromDescription}`);
  const compat = frontmatter.compatibility;
  if (compat !== undefined && (typeof compat !== 'string' || !compat.trim() || compat.length > COMPATIBILITY_MAX)) {
    problems.push(`The "compatibility" in ${at} has to be 1 to ${COMPATIBILITY_MAX} characters, or left out.`);
  }
  return problems;
}
