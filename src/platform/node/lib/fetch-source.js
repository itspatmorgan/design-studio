// Gets a source (src/platform/core/modules/pack.ts parseSource) into a folder to read, and nothing else: nothing in it is
// run. A git address is cloned shallow over https or ssh only, a tarball is downloaded over https and unpacked, and a
// folder is used where it is. Every file is checked afterward: no links, no paths that climb out, and limits on how many
// and how large. Returns { dir, origin, cleanup }.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES, plainPath } from '../../core/modules/pack.ts';
import { boundedDownload, extractArchive } from './source-archive.js';

const MAX_DOWNLOAD = 50 * 1024 * 1024;
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL: 'https:ssh', GIT_CONFIG_NOSYSTEM: '1' };

// Every file under `dir` as { rel, size }, in order. Throws on a link, a path that isn't plain, or too much.
export function walk(dir) {
  const files = [];
  let total = 0;
  const visit = (abs, rel) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.name === '.git' || e.name === 'node_modules' || e.name === '.DS_Store') continue;
      const childAbs = path.join(abs, e.name);
      const stat = fs.lstatSync(childAbs);
      if (stat.isSymbolicLink()) throw new Error(`${childRel} is a link. Links aren't allowed in a module.`);
      if (stat.isDirectory()) {
        visit(childAbs, childRel);
        continue;
      }
      if (!stat.isFile()) throw new Error(`${childRel} isn't a regular file.`);
      if (!plainPath(childRel)) throw new Error(`${childRel} isn't a plain path.`);
      if (stat.size > MAX_FILE_BYTES)
        throw new Error(
          `${childRel} is ${(stat.size / 1048576).toFixed(1)} MB, and the limit for one file is ${MAX_FILE_BYTES / 1048576} MB.`,
        );
      total += stat.size;
      files.push({ rel: childRel, size: stat.size });
      if (files.length > MAX_FILES) throw new Error(`It has more than ${MAX_FILES} files.`);
      if (total > MAX_TOTAL_BYTES) throw new Error(`It is larger than ${MAX_TOTAL_BYTES / 1048576} MB.`);
    }
  };
  visit(dir, '');
  return files;
}

// A pack can sit in a folder inside the download (a tarball's top folder, or --path): step into the one folder.
function enter(dir, sub) {
  let at = dir;
  if (sub) {
    if (!plainPath(sub)) throw new Error(`"${sub}" isn't a plain folder path inside the source.`);
    at = path.join(dir, ...sub.split('/'));
    const real = fs.realpathSync(at);
    if (real !== fs.realpathSync(dir) && !real.startsWith(fs.realpathSync(dir) + path.sep))
      throw new Error('That folder is outside the source.');
  } else {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(e => e.name !== '.git' && e.name !== '.DS_Store');
    if (
      entries.length === 1 &&
      entries[0].isDirectory() &&
      !fs.existsSync(path.join(dir, 'module.ts')) &&
      !fs.existsSync(path.join(dir, 'system.ts'))
    )
      at = path.join(dir, entries[0].name);
  }
  if (!fs.statSync(at).isDirectory()) throw new Error("That isn't a folder.");
  return at;
}

export async function fetchSource(source, sub) {
  if (source.kind === 'path') {
    const dir = path.resolve(source.path.replace(/^~(?=$|\/)/, os.homedir()));
    if (!fs.existsSync(dir)) throw new Error(`There's no folder at ${dir}.`);
    return { dir: enter(fs.realpathSync(dir), sub), origin: { source: dir }, cleanup() {} };
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-source-'));
  const cleanup = () => fs.rmSync(tmp, { recursive: true, force: true });
  try {
    if (source.kind === 'git') {
      const repo = path.join(tmp, 'repo');
      const clone = extra =>
        execFileSync(
          'git',
          [
            '-c',
            'protocol.allow=never',
            '-c',
            'protocol.https.allow=always',
            '-c',
            'protocol.ssh.allow=always',
            'clone',
            '--depth',
            '1',
            '--no-tags',
            ...extra,
            '--',
            source.url,
            repo,
          ],
          { env: GIT_ENV, stdio: ['ignore', 'pipe', 'pipe'] },
        );
      try {
        clone(source.ref ? ['--branch', source.ref] : []);
      } catch (e) {
        // A commit can't be cloned by name: fetch it.
        if (!source.ref || !/^[0-9a-f]{7,40}$/i.test(source.ref))
          throw new Error(
            `Couldn't get ${source.url}${source.ref ? ` at ${source.ref}` : ''}: ${String(e.stderr ?? e.message)
              .trim()
              .split('\n')
              .pop()}`,
          );
        fs.rmSync(repo, { recursive: true, force: true });
        execFileSync('git', ['init', '-q', repo], { env: GIT_ENV });
        execFileSync('git', ['-C', repo, 'fetch', '--depth', '1', '--', source.url, source.ref], {
          env: GIT_ENV,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        execFileSync('git', ['-C', repo, 'checkout', '-q', 'FETCH_HEAD'], { env: GIT_ENV });
      }
      const commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { env: GIT_ENV, encoding: 'utf8' }).trim();
      return { dir: enter(repo, sub), origin: { source: source.url, ref: commit }, cleanup };
    }
    // A tarball.
    const res = await fetch(source.url, { redirect: 'follow', signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`Couldn't download ${source.url} (${res.status}).`);
    if (!/^https:/i.test(res.url)) throw new Error('The download was redirected away from https.');
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length > MAX_DOWNLOAD) throw new Error('The download is larger than 50 MB.');
    const buffer = await boundedDownload(res, MAX_DOWNLOAD);
    const dir = path.join(tmp, 'pack');
    fs.mkdirSync(dir);
    extractArchive(buffer, dir);
    return { dir: enter(dir, sub), origin: { source: source.url }, cleanup };
  } catch (e) {
    cleanup();
    throw e;
  }
}
