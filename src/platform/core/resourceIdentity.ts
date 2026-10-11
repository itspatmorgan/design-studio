// Source identity is independent of names, locations, owners, and browser routes.
// Keep this entry browser/Node compatible; creation is the only random operation.
export const RESOURCE_ID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
export const RESOURCE_ID_LENGTH = 16;
export type ResourceId = string & { readonly __resourceId: unique symbol };

export function resourceId(value: unknown): ResourceId {
  if (typeof value !== 'string' || !/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/.test(value)) {
    throw new Error('A resource ID must contain exactly 16 lowercase Crockford base32 characters.');
  }
  return value as ResourceId;
}

// Ten uniformly random bytes encode to sixteen base32 characters (80 bits).
// No timestamp, mutable field, shortened UUID, or central counter is involved.
export function createResourceId(): ResourceId {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let pending = 0,
    bits = 0,
    result = '';
  for (const byte of bytes) {
    pending = (pending << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += RESOURCE_ID_ALPHABET[(pending >>> bits) & 31];
    }
    pending &= (1 << bits) - 1;
  }
  return resourceId(result);
}

// Public addresses use IDs, but filesystem access must resolve through an inventory.
// Never use an untrusted route parameter as a repository path.
export function prototypeAddress(id: ResourceId): string {
  return `/prototypes/${resourceId(id)}`;
}

export function artifactAddress(prototype: ResourceId, artifact: ResourceId): string {
  return `${prototypeAddress(prototype)}/artifacts/${resourceId(artifact)}`;
}

export function systemAddress(id: ResourceId): string {
  return `/systems/${resourceId(id)}`;
}

// This pre-release cutover recognizes permanent addresses exclusively.
export function parsePrototypeAddress(path: string): { prototypeId: ResourceId; artifactId?: ResourceId } | null {
  const match =
    /^\/prototypes\/([0-9abcdefghjkmnpqrstvwxyz]{16})(?:\/artifacts\/([0-9abcdefghjkmnpqrstvwxyz]{16}))?\/?$/.exec(
      path,
    );
  return match ? { prototypeId: resourceId(match[1]), ...(match[2] && { artifactId: resourceId(match[2]) }) } : null;
}

export type IdentityMetadata = {
  read(source: string): ResourceId | null;
  write(source: string, id: ResourceId): string;
};

const checked = (values: string[]): ResourceId | null => {
  if (values.length > 1) throw new Error('An artifact must declare its resource identity only once.');
  return values.length ? resourceId(values[0]) : null;
};
const bomOf = (source: string) => (source.startsWith('\uFEFF') ? '\uFEFF' : '');
const newlineOf = (source: string) => (source.includes('\r\n') ? '\r\n' : '\n');

// Identity is recognized only in the leading comment region, never in code strings.
export const viewIdentity: IdentityMetadata = {
  read(source) {
    const header = /^\uFEFF?(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)*/.exec(source)?.[0] ?? '';
    const tags = [...header.matchAll(/@studio-id\b([^\r\n]*)/g)];
    return checked(tags.map(match => /^\s+([^\s*]+)(?:\s*\*\/)?\s*$/.exec(match[1])?.[1] ?? ''));
  },
  write(source, id) {
    resourceId(id);
    const current = this.read(source);
    if (current === id) return source;
    if (current) return source.replace(/(@studio-id\s+)[^\s*]+/, `$1${id}`);
    const bom = bomOf(source);
    return `${bom}/** @studio-id ${id} */${newlineOf(source)}${source.slice(bom.length)}`;
  },
};

export const diagramIdentity: IdentityMetadata = {
  read(source) {
    const header = /^\uFEFF?(?:\s|%%[^\r\n]*)*/.exec(source)?.[0] ?? '';
    return checked(
      [...header.replace(/^\uFEFF/, '').matchAll(/^[ \t]*%%\s*@studio-id\b([^\r\n]*)/gm)].map(match => match[1].trim()),
    );
  },
  write(source, id) {
    resourceId(id);
    const current = this.read(source);
    if (current === id) return source;
    if (current) return source.replace(/(%%\s*@studio-id\s+)[^\r\n]+/, `$1${id}`);
    const bom = bomOf(source);
    return `${bom}%% @studio-id ${id}${newlineOf(source)}${source.slice(bom.length)}`;
  },
};

function frontmatterRegion(source: string) {
  const opening = /^\uFEFF?---\r?\n/.exec(source);
  if (!opening) return null;
  const rest = source.slice(opening[0].length);
  const closing = /^---[ \t]*(?:\r?\n|$)/m.exec(rest);
  if (!closing) throw new Error('Close the Markdown frontmatter before assigning identity.');
  return { start: opening[0].length, end: opening[0].length + closing.index };
}

export const markdownIdentity: IdentityMetadata = {
  read(source) {
    const region = frontmatterRegion(source);
    if (!region) return null;
    const values = [...source.slice(region.start, region.end).matchAll(/^studioId:[ \t]*([^\r\n]*)/gm)].map(match =>
      match[1].trim().replace(/^(['"])(.*)\1$/, '$2'),
    );
    return checked(values);
  },
  write(source, id) {
    resourceId(id);
    const current = this.read(source);
    if (current === id) return source;
    const region = frontmatterRegion(source);
    if (region) {
      const original = source.slice(region.start, region.end);
      const updated = current
        ? original.replace(/^studioId:[^\r\n]*/m, `studioId: ${id}`)
        : `studioId: ${id}${newlineOf(source)}${original}`;
      return source.slice(0, region.start) + updated + source.slice(region.end);
    }
    const bom = bomOf(source),
      nl = newlineOf(source);
    return `${bom}---${nl}studioId: ${id}${nl}---${nl}${source.slice(bom.length)}`;
  },
};

// JSON.parse accepts duplicate object keys. Source metadata must not use that
// last-wins behavior for identity, ownership, or other top-level declarations.
export function jsonIdentity(source: string): ResourceId | null {
  const value: unknown = JSON.parse(source);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Resource metadata must be a JSON object.');
  let depth = 0;
  const declarations = new Set<string>();
  for (const token of source.matchAll(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]]/g)) {
    if (token[0] === '{' || token[0] === '[') depth++;
    else if (token[0] === '}' || token[0] === ']') depth--;
    else if (depth === 1 && /^\s*:/.test(source.slice(token.index! + token[0].length))) {
      const key = JSON.parse(token[0]) as string;
      if (declarations.has(key)) throw new Error(`Resource metadata must declare ${key} only once.`);
      declarations.add(key);
    }
  }
  const id = (value as Record<string, unknown>).studioId;
  return id === undefined ? null : resourceId(id);
}

export const canvasIdentity: IdentityMetadata = {
  read: jsonIdentity,
  write(source, id) {
    resourceId(id);
    if (this.read(source) === id) return source;
    return JSON.stringify({ ...JSON.parse(source), studioId: id }, null, 2) + '\n';
  },
};
