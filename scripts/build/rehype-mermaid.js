// Preserve Mermaid source before Shiki turns ordinary code blocks into highlighted spans.
// A platform component renders this internal element; authors still write plain Markdown.
export default function rehypeMermaid() {
  return function walk(node) {
    if (!node.children) return;
    node.children = node.children.map(child => {
      const code = child.tagName === 'pre' && child.children?.length === 1 && child.children[0];
      if (code?.tagName === 'code' && code.properties?.className?.includes('language-mermaid')) {
        return {
          type: 'element',
          tagName: 'mermaid-diagram',
          properties: { source: code.children.map(part => part.value ?? '').join('') },
          children: [],
        };
      }
      walk(child);
      return child;
    });
  };
}
