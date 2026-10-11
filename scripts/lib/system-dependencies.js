// Package ownership is checked before resolution: root node_modules is not a grant.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import semver from 'semver';

export const SHARED_RUNTIME_PACKAGES = ['react', 'react-dom', 'lucide-react', '@tanstack/react-router'];
export const SYSTEM_RUNTIME_PACKAGES = ['react', 'react-dom'];
export function packageName(source) {
  if (!source || /^(?:\.|\/|@\/|@module\/|\0)/.test(source)) return null;
  return source.startsWith('@') ? source.split('/').slice(0, 2).join('/') : source.split('/')[0];
}
export function systemPackage(dir) {
  const file = path.join(dir, 'package.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error(`${file}: provide a valid system package.json (${error.code ?? error.message}).`); }
}
export function installedPackage(dir, name) {
  const require = createRequire(path.join(dir, 'package.json'));
  // Exports maps can hide package.json. Locate it from the resolved public entry.
  let at = path.dirname(require.resolve(name));
  while (at !== path.dirname(at)) {
    const file = path.join(at, 'package.json');
    if (fs.existsSync(file)) {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (pkg.name === name) return pkg;
    }
    at = path.dirname(at);
  }
  throw new Error(`Cannot read the installed version of ${name}.`);
}
export function systemDependencyProblems(root, systems) {
  const problems = [];
  const names = new Set();
  const host = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const [id, spec] of Object.entries(systems)) {
    if (spec.role !== 'prototype') continue;
    const dir = path.resolve(root, spec.dir ?? `src/systems/${id}`);
    let pkg;
    try { pkg = systemPackage(dir); } catch (error) { problems.push(error.message); continue; }
    const fail = message => problems.push(`src/systems/${id}/package.json: ${message}`);
    if (pkg.private !== true || typeof pkg.name !== 'string' || !pkg.name.startsWith('@studio-system/')) fail('declare private: true and a unique @studio-system/<identity> name.');
    if (names.has(pkg.name)) fail('another system uses this package name.');
    names.add(pkg.name);
    for (const field of ['dependencies', 'peerDependencies']) {
      if (!pkg[field] || typeof pkg[field] !== 'object' || Array.isArray(pkg[field]) || Object.values(pkg[field]).some(value => typeof value !== 'string' || !value.trim())) fail(`declare ${field} as a package-to-version object (use {} when empty).`);
    }
    for (const name of SYSTEM_RUNTIME_PACKAGES) {
      if (pkg.dependencies?.[name] || pkg.optionalDependencies?.[name] || pkg.devDependencies?.[name]) fail(`${name} is supplied by Studio; declare it only as a peer dependency.`);
      if (pkg.peerDependencies?.[name] !== host.dependencies?.[name]) fail(`${name} must use Studio's peer requirement ${host.dependencies?.[name]}.`);
    }
    for (const library of Array.isArray(spec.libraries) ? spec.libraries : []) {
      if (!library || typeof library !== 'object') continue;
      if (library.kind === 'source') continue;
      if (!pkg.dependencies?.[library.package]) fail(`${library.package} is exposed as a library but is not a direct dependency.`);
      if (library.entry === undefined) continue;
      const entry = path.resolve(dir, typeof library.entry === 'string' ? library.entry : '');
      if (!entry.startsWith(dir + path.sep) || !fs.existsSync(entry) || !fs.statSync(entry).isFile() || !fs.realpathSync(entry).startsWith(fs.realpathSync(dir) + path.sep)) fail(`library entry ${library.entry} is missing or outside its system.`);
    }
  }
  return problems;
}
export function systemLibraryInventory(root, id, spec) {
  if (!Array.isArray(spec.libraries) || !spec.libraries.length) return [];
  const dir = path.resolve(root, spec.dir ?? `src/systems/${id}`);
  const pkg = systemPackage(dir);
  return spec.libraries.map(library => {
    if (library.kind === 'source') return { ...library, requirement: null, version: library.version ?? null };
    let version = null;
    try { if (fs.existsSync(path.join(dir, 'node_modules', library.package))) version = installedPackage(dir, library.package).version; } catch { /* Report missing installation in the UI. */ }
    return { ...library, requirement: pkg.dependencies?.[library.package] ?? null, version };
  });
}

// Check runtime dependency graphs, excluding unrelated host tooling such as the CLI.
export function systemPeerProblems(root, systems) {
  const problems = [];
  const host = Object.fromEntries(SYSTEM_RUNTIME_PACKAGES.map(name => [name, installedPackage(root, name).version]));
  function manifest(from, name) {
    for (let at = from; ; at = path.dirname(at)) {
      const file = path.join(at, 'node_modules', name, 'package.json');
      if (fs.existsSync(file)) return fs.realpathSync(file);
      if (at === path.dirname(at)) return null;
    }
  }
  for (const [id, spec] of Object.entries(systems)) {
    if (spec.role !== 'prototype') continue;
    const dir = path.resolve(root, spec.dir ?? `src/systems/${id}`);
    let pkg;
    try { pkg = systemPackage(dir); } catch { continue; } // Structural validation reports this.
    const seen = new Set();
    function visit(from, name) {
      const file = manifest(from, name);
      if (!file || seen.has(file)) return;
      seen.add(file);
      const dependency = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const [runtime, version] of Object.entries(host)) {
        const requirement = dependency.peerDependencies?.[runtime];
        if (requirement && !semver.satisfies(version, requirement)) problems.push(`${id}: ${dependency.name}@${dependency.version} requires ${runtime} ${requirement}, but Studio supplies ${version}. Choose a compatible library version.`);
        if (dependency.dependencies?.[runtime]) {
          const privateFile = manifest(path.dirname(file), runtime);
          if (privateFile && JSON.parse(fs.readFileSync(privateFile, 'utf8')).version !== version) problems.push(`${id}: ${dependency.name} installs a private ${runtime} version. Use a library compatible with Studio's shared runtime.`);
        }
      }
      for (const child of Object.keys({ ...dependency.dependencies, ...dependency.optionalDependencies })) if (!SYSTEM_RUNTIME_PACKAGES.includes(child)) visit(path.dirname(file), child);
    }
    for (const [name, requirement] of Object.entries(pkg.dependencies ?? {})) {
      const owned = path.join(dir, 'node_modules', name, 'package.json');
      if (!fs.existsSync(owned)) { problems.push(`${id}: ${name} is declared but not installed in this system. Run pnpm install --ignore-scripts.`); continue; }
      const installed = JSON.parse(fs.readFileSync(owned, 'utf8'));
      if (typeof requirement === 'string' && semver.validRange(requirement) && !semver.satisfies(installed.version, requirement)) problems.push(`${id}: installed ${name}@${installed.version} does not match ${requirement}. Run pnpm install --ignore-scripts.`);
      visit(dir, name);
    }
  }
  return [...new Set(problems)];
}
