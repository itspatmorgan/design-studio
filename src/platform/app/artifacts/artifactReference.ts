// Resolve a document's file reference without allowing it outside its prototype.
export function artifactReference(source: string, base: string | null) {
  if (!base || !base.startsWith('/prototypes/') || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(source)) return null;
  try {
    const document = base.split('/').filter(Boolean).slice(0, 3);
    const url = new URL(source, `http://document${base}/`);
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts.some(part => part === '.' || part === '..' || /[\\/]/.test(part))) return null;
    if (!document.every((part, index) => decodeURIComponent(part) === parts[index]) || parts.length < 4) return null;
    const path = parts.slice(3).join('/');
    if (!/\.[a-z0-9]+$/i.test(path) || parts.slice(3).some(part => part.startsWith('_'))) return null;
    return { contributor: parts[1], prototype: parts[2], path };
  } catch {
    return null;
  }
}
