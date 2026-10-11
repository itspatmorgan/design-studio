import fs from 'node:fs';
import path from 'node:path';

// The anchor may itself be reached through an OS alias; everything below it must be a real directory.
export function canonicalDirectory(dir, anchor) {
  if (typeof dir !== 'string' || typeof anchor !== 'string') return null;
  const relative = path.relative(anchor, dir);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  try {
    let current = anchor;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) return null;
    }
    return fs.realpathSync(dir);
  } catch {
    return null;
  }
}
