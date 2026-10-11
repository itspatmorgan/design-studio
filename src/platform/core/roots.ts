// Owner guidance lives in platform, module, or system context/ and skills/ folders.
// Platform and module guidance opens under /documentation/context; system guidance under /systems.
// The reserved system-content key adapts these files to the shared file APIs, not a contributor.
// This file has no imports, so Node scripts can load it directly.

export const SYSTEM_CONTENT_KEY = 'system-content';
export const systemRoot = (system: string) =>
  system === 'platform.core'
    ? 'platform'
    : system.startsWith('module.')
      ? `modules/${system.slice(7)}`
      : `systems/${system}`;
export const contentId = (system: string, section: string) => `${system}:${section}`;
export const contentParts = (id: string) => {
  const [system, section] = id.split(':');
  return { system, section };
};
export const contentSection = (id: string) => contentParts(id).section;

// A prototype system's components (src/systems/<id>/components/) are opened for editing the same
// way: under the reserved key "systems" (already an app page URL, so nobody's folder), with the
// system's id as the prototype ("studio" is the app's own, in src/systems/studio/components/). Studio
// files too: changed in the repo and reviewed.
export const SYSTEMS_KEY = 'systems';

// A module can hold prototype-shaped folders of its own, one per id (a section item is src/examples/<id>/): its section
// key stands where a contributor's would, so an item opens at /examples/<id>. The app and the build register the
// keys from the module list at startup (src/platform/core/modules/index.ts), and rootOf reads them.
let sectionKeys: ReadonlySet<string> = new Set();
export const setSections = (keys: Iterable<string>) => {
  sectionKeys = new Set(keys);
};

// The system content's sections: the folders in each system, in the order they're shown. The shape of
// each is checked by src/modules/systems/content/node/content-check.js.
export const SYSTEM_CONTENT_SECTIONS = {
  context: {
    title: 'Context',
    description: 'Context for people and agents: principles, personas, and anything worth writing down once.',
  },
  skills: {
    title: 'Skills',
    description: 'Procedures your agent follows when you ask, one folder each, in the Agent Skills format.',
  },
} as const;

export const isSystemContentSection = (id: string): id is keyof typeof SYSTEM_CONTENT_SECTIONS =>
  Object.prototype.hasOwnProperty.call(SYSTEM_CONTENT_SECTIONS, id);

// The key of the section that holds everyone's prototypes (the Prototypes module): /prototypes.
export const PROTOTYPES_KEY = 'prototypes';

// Whether a key names a section (systemContent, systems, or a module section) rather than a person. The first part of an item's
// address is a section's key, or, for a prototype, "prototypes" and then the person's.
export const isSectionKey = (key: string) => key === SYSTEM_CONTENT_KEY || key === SYSTEMS_KEY || sectionKeys.has(key);

// An item's address in the app, up to its id and without a base path: "/prototypes/patrick/hello-world"
// for a prototype, "/examples/sample" for a section item.
export const addressOf = (contributor: string, id: string) =>
  contributor === SYSTEM_CONTENT_KEY
    ? `${contentParts(id).system === 'platform.core' || contentParts(id).system.startsWith('module.') ? '/documentation/context' : '/systems'}/${contentParts(id).system}/${contentParts(id).section}`
    : isSectionKey(contributor)
      ? `/${contributor}/${id}`
      : `/${PROTOTYPES_KEY}/${contributor}/${id}`;

// Reads an item's address back: who or what holds it, its id, and the path after it. It also reads the
// older form of a prototype's address, "/patrick/hello-world/…", so links saved before prototypes moved
// under /prototypes still open. Null if there isn't an id.
export function parseAddress(path: string): { contributor: string; id: string; rest: string[] } | null {
  const parts = path
    .replace(/^\/documentation\/context(?=\/)/, '/knowledge')
    .split('/')
    .filter(Boolean);
  if ((parts[0] === 'systems' || parts[0] === 'knowledge') && parts[1] && isSystemContentSection(parts[2]))
    return { contributor: SYSTEM_CONTENT_KEY, id: contentId(parts[1], parts[2]), rest: parts.slice(3) };
  if (parts[0] === 'knowledge' || path.startsWith('/documentation/')) return null;
  const body = parts[0] === PROTOTYPES_KEY ? parts.slice(1) : parts;
  return body.length >= 2 ? { contributor: body[0], id: body[1], rest: body.slice(2) } : null;
}

// An item path in today's form: the older "/patrick/hello-world/lofi/main" becomes "/prototypes/patrick/hello-world/lofi/main".
// Paths already in today's form, and anything that isn't an item's address, come back unchanged.
export function canonicalPath(path: string): string {
  const address = parseAddress(path);
  return address ? [addressOf(address.contributor, address.id), ...address.rest].join('/') : path;
}

// The folder holding an item's files, relative to src/.
export const rootOf = (contributor: string, id: string) =>
  contributor === SYSTEM_CONTENT_KEY
    ? `${systemRoot(contentParts(id).system)}/${contentParts(id).section}`
    : sectionKeys.has(contributor)
      ? `${contributor}/${id}`
      : contributor === SYSTEMS_KEY
        ? `${SYSTEMS_KEY}/${id}/components`
        : `prototypes/${contributor}/${id}`;
