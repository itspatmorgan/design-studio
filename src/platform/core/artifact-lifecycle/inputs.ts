import type { SourceRevision } from './state.ts';

export type RevisionSnapshot = SourceRevision & { sources: [string, string][] };
export const compiledInputs = (): Map<string, string> =>
  (globalThis as unknown as Record<symbol, Map<string, string>>)[Symbol.for('studio.compiled-inputs')] ?? new Map();

export async function digestText(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export const digestInputs = (sources: [string, string][]) => digestText(JSON.stringify(sources));
export function applied(snapshot: RevisionSnapshot) {
  const compiled = compiledInputs();
  return snapshot.sources.every(([path, version]) => compiled.get(path) === version);
}
export async function readRevision(file: {
  contributor: string;
  prototype: string;
  path: string;
}): Promise<RevisionSnapshot> {
  const query = new URLSearchParams(file);
  const response = await fetch('/__studio/revision?' + query, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Preview inputs could not be verified.');
  const body = (await response.json()) as RevisionSnapshot;
  const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  if (
    !hash(body.source) ||
    !hash(body.inputs) ||
    !Array.isArray(body.sources) ||
    body.sources.length === 0 ||
    body.sources.length > 512 ||
    body.sources.some(
      pair =>
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        typeof pair[0] !== 'string' ||
        !pair[0].startsWith('/') ||
        pair[0].length > 2048 ||
        !hash(pair[1]),
    )
  )
    throw new Error('Invalid preview revision.');
  if ((await digestInputs(body.sources)) !== body.inputs) throw new Error('Invalid preview input digest.');
  return body;
}
