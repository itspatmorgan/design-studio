// A Markdown file's title is the `title` in its frontmatter. In plain Markdown it is usually the
// first heading. A matching opening H1 is suppressed when frontmatter already supplies the title.
// Otherwise, when there's no `title` and the file opens with a level-1 heading, that heading
// becomes the title and leaves the body. A skill's SKILL.md has no title in its format, so without
// a heading its `name` is the title ("document-component" → "Document component"). The page then
// shows its title, its description, and its content, in that order.
// Runs before remark-mdx-frontmatter, which reads the frontmatter this edits.
import { skillTitle, SKILL_FILE } from '../../modules/systems/content/skills.ts';
import { frontmatter } from '../lib/frontmatter.js';

const textOf = node => (typeof node.value === 'string' ? node.value : (node.children ?? []).map(textOf).join(''));

export default function remarkTitleFromHeading() {
  return (tree, file) => {
    const yaml = tree.children.find(n => n.type === 'yaml');
    const heading = tree.children.find(n => n.type !== 'yaml');
    if (yaml && /^title\s*:/m.test(yaml.value)) {
      const declared = frontmatter(`---\n${yaml.value}\n---`)?.title;
      // Remove only a duplicate opening title. Differing headings and later sections remain content.
      if (
        typeof declared === 'string' &&
        heading?.type === 'heading' &&
        heading.depth === 1 &&
        textOf(heading).trim() === declared.trim()
      ) {
        tree.children.splice(tree.children.indexOf(heading), 1);
      }
      return;
    }
    let title = heading?.type === 'heading' && heading.depth === 1 ? textOf(heading).trim() : '';
    const isHeading = Boolean(title);
    if (!title && (file?.basename ?? file?.path?.split(/[\\/]/).pop()) === SKILL_FILE) {
      const name = yaml?.value.match(/^name\s*:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
      if (name) title = skillTitle(name);
    }
    if (!title) return;
    // A JSON string is a valid YAML string, so quotes and colons in a title are safe.
    const line = `title: ${JSON.stringify(title)}`;
    if (yaml) yaml.value = yaml.value ? `${yaml.value}\n${line}` : line;
    else tree.children.unshift({ type: 'yaml', value: line });
    if (isHeading) tree.children.splice(tree.children.indexOf(heading), 1);
  };
}
