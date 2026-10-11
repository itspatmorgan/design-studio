// Inspect static startup dependencies without downloading a browser or contacting a host.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

export function inspectBuild(directory) {
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
  const assets = [...initial].map(file => ({ file, bytes: read(file).length, gzipBytes: gzipSync(read(file)).length }));
  return {
    requests: assets.length,
    bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    gzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
    assets,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const result = inspectBuild(path.resolve(process.argv[2] || 'dist'));
  console.log(
    `Initial JavaScript/CSS: ${result.requests} files, ${(result.bytes / 1024).toFixed(1)} KiB raw, ${(result.gzipBytes / 1024).toFixed(1)} KiB gzip. All manifest references exist.`,
  );
}
