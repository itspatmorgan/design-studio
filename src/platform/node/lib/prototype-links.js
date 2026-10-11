import fs from 'node:fs';
import path from 'node:path';
import { repairText } from './artifact-moves.js';

export const escapeAddress = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const personAddress = (key, id) => `(?:/prototypes)?${escapeAddress(`/${key}/${id}`)}`;
export const addressPattern = address => new RegExp(`(?<![A-Za-z0-9:/.])${address}(?![A-Za-z0-9_%-])`, 'g');

// Never follow symlinks or edit another prototype.
export function linkedFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory()
      ? linkedFiles(file)
      : entry.isFile() && /\.(md|excalidraw|[cm]?[jt]sx?)$/.test(entry.name)
        ? [file]
        : [];
  });
}

// Read and prepare everything before moving. If a write fails, restore the files and address.
export function moveWithLinks(from, to, meta, address, nextAddress, sourceAddress) {
  const changes = linkedFiles(from)
    .map(file => {
      const content = fs.readFileSync(file, 'utf8');
      const rel = path.relative(from, file).split(path.sep).join('/');
      const next = /\.[cm]?[jt]sx?$/.test(rel)
        ? sourceAddress
          ? repairText(content, rel, rel, new Map(), new Map(), [sourceAddress, nextAddress])
          : content
        : content.replace(addressPattern(address), nextAddress);
      return { rel, content, next };
    })
    .filter(({ content, next }) => content !== next);
  const originalMeta = fs.readFileSync(path.join(from, 'meta.json'), 'utf8');
  changes.push({ rel: 'meta.json', content: originalMeta, next: JSON.stringify(meta, null, 2) + '\n' });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (from !== to) fs.renameSync(from, to);
  try {
    for (const change of changes) fs.writeFileSync(path.join(to, change.rel), change.next);
  } catch (error) {
    for (const change of changes) fs.writeFileSync(path.join(to, change.rel), change.content);
    if (from !== to) fs.renameSync(to, from);
    throw error;
  }
}
