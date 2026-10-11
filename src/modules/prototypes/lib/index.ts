// Supported runtime navigation for prototype code. Paths remain authoring
// dependencies; the supplied inventory resolves them to permanent public URLs.
import { createContext, useContext } from 'react';

export type PrototypeNavigationScope = {
  studioId?: string;
  currentArtifactId?: string;
  artifacts: readonly { path: string; studioId?: string }[];
};
const scope = createContext<PrototypeNavigationScope | null>(null);
export const PrototypeNavigationProvider = scope.Provider;

export function prototypeArtifactHref(prototype: PrototypeNavigationScope, path: string): string {
  const suffixAt = path.search(/[?#]/);
  const file = suffixAt < 0 ? path : path.slice(0, suffixAt);
  const suffix = suffixAt < 0 ? '' : path.slice(suffixAt);
  const matches = prototype.artifacts.filter(item => item.path === file || item.path.replace(/\.[^./]+$/, '') === file);
  if (matches.length > 1) throw new Error(`Prototype path "${file}" is ambiguous.`);
  const artifact = matches[0];
  if (!prototype.studioId || !artifact?.studioId)
    throw new Error(`No identified artifact exists at prototype path "${file}".`);
  if (![prototype.studioId, artifact.studioId].every(id => /^[0-9abcdefghjkmnpqrstvwxyz]{16}$/.test(id)))
    throw new Error('Invalid prototype navigation identity.');
  return `/prototypes/${prototype.studioId}/artifacts/${artifact.studioId}${suffix}`;
}

export function usePrototypeArtifactHref(): (path: string) => string {
  const prototype = useContext(scope);
  if (!prototype) throw new Error('Prototype navigation requires a rendered prototype view.');
  return path => prototypeArtifactHref(prototype, path);
}

// Selection belongs to the rendered view, including a prototype's index URL
// and embedded previews, rather than to a pathname that may show another view.
export function useIsPrototypeArtifact(path: string): boolean {
  const prototype = useContext(scope);
  if (!prototype) throw new Error('Prototype navigation requires a rendered prototype view.');
  const href = prototypeArtifactHref(prototype, path).split(/[?#]/)[0];
  return Boolean(
    prototype.currentArtifactId &&
      href === `/prototypes/${prototype.studioId}/artifacts/${prototype.currentArtifactId}`,
  );
}
