// Inspect static startup dependencies without downloading a browser or contacting a host.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

export function inspectBuild(directory, startup) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, '.vite/manifest.json'), 'utf8'));
  const entry = Object.keys(manifest).find(key => manifest[key].isEntry && key.endsWith('index.html'));
  if (!entry) throw new Error('The production manifest has no HTML entry.');
  const initial = new Set();
  const visited = new Set();
  const read = file => {
    const absolute = path.resolve(directory, file);
    if (!absolute.startsWith(path.resolve(directory) + path.sep))
      throw new Error(`Build asset escapes output: ${file}`);
    return fs.readFileSync(absolute);
  };
  // Validate every emitted reference, including lazy chunks, without loading them at startup.
  for (const item of Object.values(manifest)) {
    for (const file of [item.file, ...(item.css || []), ...(item.assets || [])]) read(file);
    for (const key of [...(item.imports || []), ...(item.dynamicImports || [])]) {
      if (!manifest[key]) throw new Error(`Missing build dependency: ${key}`);
    }
  }
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const item = manifest[key];
    initial.add(item.file);
    for (const file of item.css || []) initial.add(file);
    for (const dependency of item.imports || []) visit(dependency);
  }
  visit(entry);
  // main.tsx immediately chooses StudioRoot or the standalone preview. Neither is deferred UX.
  if (startup) {
    if (!manifest[startup]) throw new Error(`Missing startup entry: ${startup}`);
    visit(startup);
  }
  const assets = [...initial].map(file => {
    const bytes = read(file);
    return { file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
  });
  return {
    requests: assets.length,
    bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    gzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
    assets,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const directory = path.resolve(process.argv[2] || 'dist');
  for (const [name, entry] of [
    ['HTML bootstrap', undefined],
    ['Studio startup', 'platform/app/StudioRoot.tsx'],
    ['Standalone preview startup', 'platform/modules/view/preview/main.tsx'],
  ]) {
    const result = inspectBuild(directory, entry);
    const gzip = extension =>
      result.assets.filter(asset => asset.file.endsWith(extension)).reduce((sum, asset) => sum + asset.gzipBytes, 0);
    console.log(
      `${name}: ${result.requests} JS/CSS files; JS ${(gzip('.js') / 1024).toFixed(1)} KiB gzip, CSS ${(gzip('.css') / 1024).toFixed(1)} KiB gzip. All manifest references exist.`,
    );
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, '.vite/manifest.json'), 'utf8'));
  const chunks = [...new Set(Object.values(manifest).map(item => item.file))]
    .filter(file => file.endsWith('.js'))
    .map(file => ({ file, gzipKiB: +(gzipSync(fs.readFileSync(path.join(directory, file))).length / 1024).toFixed(1) }))
    .sort((a, b) => b.gzipKiB - a.gzipKiB)
    .slice(0, 5);
  console.log('Largest emitted JavaScript chunks (including deferred features):');
  console.table(chunks);
}
