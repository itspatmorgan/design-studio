import fs from 'node:fs';
import path from 'node:path';

// Disposable source clones share installed packages without mutating the host install.
export function linkSystemDependencies(from, to) {
  const systems = path.join(from, 'src/systems');
  for (const id of fs.readdirSync(systems)) {
    const source = path.join(systems, id, 'node_modules');
    const destination = path.join(to, 'src/systems', id, 'node_modules');
    if (fs.existsSync(source) && fs.existsSync(path.dirname(destination)) && !fs.existsSync(destination))
      fs.symlinkSync(source, destination);
  }
}
