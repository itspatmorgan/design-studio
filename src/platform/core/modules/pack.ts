// The pure parts of adding a module or design system from a source (src/platform/node/cli/studio.js): what a source can be,
// where each file of a pack goes, whether a license is one a team can build on, and the edits to AGENTS.md
// (studio.config.json is edited with src/platform/core/config-file.ts). Nothing here touches files or the network, so
// every rule is tested. Has only type imports, and the import-free roots.ts.
import type { ModuleSpec } from './index.ts';
import { TEAM_MODULES_ROOT, TEAM_SYSTEMS_ROOT, moduleFolder } from '../roots.ts';

export type Source =
  | { kind: 'path'; path: string }
  | { kind: 'git'; url: string; ref?: string }
  | { kind: 'tarball'; url: string };

const REF = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const BAD_CHARS = /[\s\0-\x1f\x7f]/;
const CONTROL = /[\0-\x1f\x7f]/;

// What a source is: a folder on this computer, a git repository (https or ssh, with an optional #branch, tag or commit),
// or a .tar.gz at an https address. Anything else (http, file://, git://, ext::) is refused with the reason.
export function parseSource(text: string): Source | { error: string } {
  const raw = text.trim();
  if (!raw) return { error: 'Say where the module comes from: a folder, a git address, or a .tar.gz address.' };
  if (CONTROL.test(raw) || raw.startsWith('-')) return { error: `"${raw}" isn't a folder or an address.` };
  const hashAt = raw.indexOf('#');
  const location = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const ref = hashAt === -1 ? undefined : raw.slice(hashAt + 1);
  const looksLikeAddress = /^([A-Za-z][A-Za-z0-9+.-]*:|git@)/.test(location) && !/^[A-Za-z]:[\\/]/.test(location);
  if (looksLikeAddress && BAD_CHARS.test(location)) return { error: `"${raw}" isn't a folder or an address.` };
  if (/^https:\/\//i.test(location) && /\.(tar\.gz|tgz)$/i.test(location.split('?')[0])) {
    if (ref !== undefined) return { error: 'A .tar.gz address has no #ref. Point at the file you want.' };
    return { kind: 'tarball', url: location };
  }
  if (/^http:\/\//i.test(location)) return { error: 'Use an https address. Plain http can be changed on the way.' };
  const git =
    /^https:\/\/[^/]+\/.+/i.test(location) ||
    /^ssh:\/\/[^/]+\/.+/i.test(location) ||
    /^git@[A-Za-z0-9.-]+:[^/].*/.test(location);
  if (git) {
    if (ref !== undefined && !REF.test(ref)) return { error: `"${ref}" isn't a branch, tag or commit name.` };
    return { kind: 'git', url: location, ...(ref !== undefined && { ref }) };
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(location) && !/^[A-Za-z]:[\\/]/.test(location))
    return {
      error: `"${location.split(':')[0]}:" addresses aren't supported. Use an https or ssh git address, an https .tar.gz, or a folder.`,
    };
  if (ref !== undefined) return { error: 'A folder has no #ref.' };
  return { kind: 'path', path: location };
}

export type Kind = 'module' | 'system';
export type Move = { from: string; to: string };
export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

const SKIP = (name: string) => name === '.DS_Store' || name === 'node_modules' || name === '.git';

// Whether a path inside a pack is plain: relative, no "..", no empty parts, no backslashes or control characters.
export const plainPath = (p: string) =>
  p.length > 0 &&
  !p.startsWith('/') &&
  !p.includes('\\') &&
  !BAD_CHARS.test(p) &&
  p.split('/').every(s => s !== '' && s !== '.' && s !== '..');

// Where each file of a pack goes. `files` are paths inside the pack. A module pack's files go to the team's module
// root, <module folder>/ (the supplied root is upstream's), except instructions/ (strip its prefix for declared module-owned guidance) and content/ (to the section's folder,
// which the module must declare). A design system pack goes to the team's system root, src/systems/<id>/ (the supplied root is upstream's). Hidden files are left behind.
export function packPlan(
  kind: Kind,
  id: string,
  spec: Partial<ModuleSpec> | undefined,
  files: readonly string[],
  _platformId: string = 'studio',
): { moves: Move[]; skipped: string[]; problems: string[] } {
  const moves: Move[] = [];
  const skipped: string[] = [];
  const problems: string[] = [];
  const systemContent = (spec?.instructions ?? []).map(h => h.path);
  const declared = (p: string) => systemContent.some(h => (h.endsWith('/') ? p.startsWith(h) : p === h));
  if (files.length > MAX_FILES) problems.push(`It has ${files.length} files, and the limit is ${MAX_FILES}.`);
  for (const file of files) {
    if (!plainPath(file)) {
      problems.push(`"${file}" isn't a plain path inside the pack.`);
      continue;
    }
    const parts = file.split('/');
    if (parts.some(SKIP) || parts.some(s => s.startsWith('.') && s !== '.gitkeep')) {
      skipped.push(file);
      continue;
    }
    if (kind === 'system') {
      moves.push({ from: file, to: `${TEAM_SYSTEMS_ROOT}/${id}/${file}` });
      continue;
    }
    if (parts[0] === 'instructions') {
      const inside = parts.slice(1).join('/');
      if (!inside) continue;
      if (!declared(inside))
        problems.push(
          `instructions/${inside} isn't listed in the module's instructions, so it won't be installed. List it in module.ts, or remove it.`,
        );
      else moves.push({ from: file, to: `${TEAM_MODULES_ROOT}/${id}/${inside}` });
    } else if (parts[0] === 'content') {
      const inside = parts.slice(1).join('/');
      if (!inside) continue;
      if (!spec?.section) problems.push(`content/${inside}: a module with no section has nowhere for content to go.`);
      else moves.push({ from: file, to: `${spec.section.folder}/${inside}` });
    } else {
      moves.push({ from: file, to: `${TEAM_MODULES_ROOT}/${id}/${file}` });
    }
  }
  // Everything the module says it brings has to be in the pack.
  for (const h of systemContent) {
    const present = moves.some(m =>
      h.endsWith('/') ? m.to.startsWith(`${TEAM_MODULES_ROOT}/${id}/${h}`) : m.to === `${TEAM_MODULES_ROOT}/${id}/${h}`,
    );
    if (!present) problems.push(`module.ts lists instructions/${h}, which isn't in the pack.`);
  }
  const seen = new Set<string>();
  for (const m of moves) {
    if (seen.has(m.to)) problems.push(`Two files would be written to ${m.to}.`);
    seen.add(m.to);
  }
  return { moves, skipped, problems };
}

// Licenses a team can build on without a second thought. Anything else needs a person to say it's fine.
export const PERMISSIVE_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'Unlicense',
  'CC0-1.0',
  'Zlib',
];

// How a module built around a library stands on licensing: fine, no license at all (refused), or one that isn't on
// the permissive list (needs --allow-license). `hasLicenseFile` is whether a LICENSE file came with it.
export function licenseVerdict(
  spec: Partial<ModuleSpec>,
  hasLicenseFile: boolean,
): 'ok' | 'none' | 'not-permissive' | 'not-applicable' {
  if (!spec.upstream) return 'not-applicable';
  const license = spec.upstream.license.trim();
  if (!license || /^(none|unlicensed)$/i.test(license) || !hasLicenseFile) return 'none';
  return PERMISSIVE_LICENSES.includes(license) ? 'ok' : 'not-permissive';
}

export const AGENTS_START = '<!-- studio:modules -->';
export const AGENTS_END = '<!-- /studio:modules -->';

// The lines AGENTS.md gets for the modules that are on: "When the person ..., read [rule](path)." for each systemContent
// entry with a `when`, linked at the module's folder in whichever root holds it (moduleFolder). They are what routes an
// agent to a module's context and skills, so a module that's off isn't mentioned.
export function agentsBlock(modules: readonly Partial<ModuleSpec>[], _platformId: string = 'studio'): string {
  const lines = modules.flatMap(m =>
    (m.instructions ?? [])
      .filter(h => h.when)
      .map(h => {
        const target = `src/${moduleFolder(m.id!)}/${h.path}`;
        const link = h.path.endsWith('/') ? `${target}SKILL.md` : target;
        return `When the person ${h.when}, read [${link}](${link}).`;
      }),
  );
  return [AGENTS_START, ...lines, AGENTS_END].join('\n');
}

// AGENTS.md with its module lines replaced; or, the first time, put after the last "When the person" line.
export function applyAgentsBlock(text: string, block: string): string {
  const a = text.indexOf(AGENTS_START);
  const b = text.indexOf(AGENTS_END);
  if (a !== -1 && b > a) return text.slice(0, a) + block + text.slice(b + AGENTS_END.length);
  const lines = text.split('\n');
  let last = -1;
  lines.forEach((l, i) => {
    if (/^When the person/.test(l)) last = i;
  });
  if (last === -1) return `${text.replace(/\n*$/, '\n')}\n${block}\n`;
  lines.splice(last + 1, 0, block);
  return lines.join('\n');
}

// A module.ts or system.ts read as plain data, without running it. A pack comes from someone else, so reviewing it
// must not run its code: this reads `export default { ... }` (optionally `satisfies Type` or `as const`) as a literal
// of strings, numbers, true, false, null, lists and objects. Anything else (a call, a name, a template with ${}) is
// refused, because a declaration that needs code isn't plain data.
export function readDeclaration(source: string): { value: unknown } | { error: string } {
  let s = '';
  // Comments out, strings kept whole.
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1;
      s += source.slice(i, j + 1);
      i = j;
    } else if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      s += '\n';
    } else if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) return { error: 'A comment is never closed.' };
      i = end + 1;
      s += ' ';
    } else s += c;
  }
  s = s.replace(/^\s*import\s+type\s[^;\n]*;?[ \t]*$/gm, '');
  const start = /\bexport\s+default\s*/.exec(s);
  if (!start) return { error: 'It has no `export default { ... }`.' };
  let i = start.index + start[0].length;
  const fail = (what: string): never => {
    throw new Error(what);
  };
  const ws = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  function string(): string {
    const q = s[i++];
    let out = '';
    while (i < s.length && s[i] !== q) {
      if (s[i] === '\\') {
        const e = s[i + 1];
        const map: Record<string, string> = {
          n: '\n',
          t: '\t',
          r: '\r',
          '\\': '\\',
          "'": "'",
          '"': '"',
          '`': '`',
          '/': '/',
        };
        if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
          out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
          i += 6;
          continue;
        }
        if (!(e in map)) fail(`The text escape \\${e} isn't allowed in a declaration.`);
        out += map[e];
        i += 2;
      } else if (q === '`' && s[i] === '$' && s[i + 1] === '{') fail('A template with ${} needs code. Use plain text.');
      else out += s[i++];
    }
    if (s[i] !== q) fail('A piece of text is never closed.');
    i++;
    return out;
  }
  function value(): unknown {
    ws();
    const c = s[i];
    if (c === '{') {
      i++;
      const out: Record<string, unknown> = {};
      for (;;) {
        ws();
        if (s[i] === '}') {
          i++;
          return out;
        }
        let key: string;
        if (s[i] === '"' || s[i] === "'") key = string();
        else {
          const m = /^[A-Za-z_$][\w$-]*/.exec(s.slice(i));
          if (!m) return fail('Expected a name.');
          key = m[0];
          i += key.length;
        }
        ws();
        if (s[i] !== ':') fail(`Expected ":" after ${key}.`);
        i++;
        if (key === '__proto__' || key === 'constructor' || key === 'prototype')
          fail(`"${key}" isn't allowed as a name.`);
        if (Object.hasOwn(out, key))
          fail(`"${key}" is declared more than once. Remove duplicate declaration properties.`);
        out[key] = value();
        ws();
        if (s[i] === ',') i++;
        else if (s[i] !== '}') fail('Expected "," or "}".');
      }
    }
    if (c === '[') {
      i++;
      const out: unknown[] = [];
      for (;;) {
        ws();
        if (s[i] === ']') {
          i++;
          return out;
        }
        out.push(value());
        ws();
        if (s[i] === ',') i++;
        else if (s[i] !== ']') fail('Expected "," or "]".');
      }
    }
    if (c === '"' || c === "'" || c === '`') return string();
    const lit = /^(true|false|null|-?\d+(?:\.\d+)?)(?![\w$])/.exec(s.slice(i));
    if (lit) {
      i += lit[0].length;
      return lit[1] === 'true' ? true : lit[1] === 'false' ? false : lit[1] === 'null' ? null : Number(lit[1]);
    }
    return fail(
      "A declaration is plain data: text, numbers, true, false, lists and objects. It can't use names or calls.",
    );
  }
  try {
    const result = value();
    ws();
    const tail = /^(?:(?:satisfies\s+[A-Za-z_$][\w$.]*|as\s+const)\s*)*;?\s*$/.exec(s.slice(i));
    if (!tail)
      return { error: 'There is something after the declaration. Only `satisfies Type` or `as const` may follow it.' };
    if (!result || typeof result !== 'object' || Array.isArray(result)) return { error: 'It should export an object.' };
    return { value: result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
