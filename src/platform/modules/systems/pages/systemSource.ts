import { SourceChanged } from '@/platform/core/source/access';
import { TAB_ID } from '@/platform/app/data/files';

export async function systemSourceRequest<T>(
  action: 'read' | 'write' | 'reveal',
  path: string,
  extra: object = {},
): Promise<T> {
  const response = await fetch('/__studio/system-source', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json', 'X-Studio-Tab': TAB_ID },
    body: JSON.stringify({ action, path, ...extra }),
  });
  const result = await response.json();
  if (response.status === 409) throw new SourceChanged(result.error);
  if (!response.ok) throw new Error(result.error ?? 'Could not access system source.');
  return result;
}
