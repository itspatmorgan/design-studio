// A file image on its own line becomes a file embed, not an image URL request.
const isFile = node =>
  node.tagName === 'img' &&
  typeof node.properties?.src === 'string' &&
  /\.[a-z0-9]+(?:[?#]|$)/i.test(node.properties.src) &&
  !/\.(png|jpe?g|gif|webp|svg|avif|ico)(?:[?#]|$)/i.test(node.properties.src);
export default function fileEmbeds() {
  return function walk(node) {
    if (!node.children) return;
    node.children = node.children.map(child => {
      if (child.tagName === 'p' && child.children?.length === 1 && isFile(child.children[0])) {
        const image = child.children[0];
        return {
          type: 'element',
          tagName: 'prototype-artifact',
          properties: { source: image.properties.src, label: image.properties.alt || 'Artifact' },
          children: [],
        };
      }
      // Inline file references stay links, so block previews never nest inside paragraphs.
      if (isFile(child))
        return {
          type: 'element',
          tagName: 'a',
          properties: { href: child.properties.src },
          children: [{ type: 'text', value: child.properties.alt || 'Artifact' }],
        };
      walk(child);
      return child;
    });
  };
}
