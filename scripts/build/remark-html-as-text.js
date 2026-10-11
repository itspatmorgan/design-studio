// Raw HTML in a Markdown file is shown as the text that was typed, not rendered and not dropped:
// documents are plain Markdown, and something like <placeholder> in a sentence should still read.
// (An `html` node is where Markdown puts a tag; here it becomes text.) An HTML comment is dropped
// instead, so it can hold a note for whoever edits the file, like the hint in a component's .md.
const PHRASING = new Set([
  'paragraph',
  'heading',
  'emphasis',
  'strong',
  'delete',
  'link',
  'linkReference',
  'tableCell',
]);

export default function remarkHtmlAsText() {
  const walk = node => {
    if (!node.children) return;
    node.children = node.children.flatMap(child => {
      if (child.type !== 'html') {
        walk(child);
        return [child];
      }
      if (/^<!--[\s\S]*-->\s*$/.test(child.value)) return [];
      const text = { type: 'text', value: child.value };
      return [PHRASING.has(node.type) ? text : { type: 'paragraph', children: [text] }];
    });
  };
  return tree => walk(tree);
}
