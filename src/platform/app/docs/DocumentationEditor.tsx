import { canEditSource, useMe } from '@/platform/app/data/files';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/platform/systems/studio/components/button';
import SourceEditor from '@/platform/core/source/SourceEditor';
import type { SourceAccess } from '@/platform/core/source/access';
import { documentationRequest } from './documentationSource';
import { shortcutLabel } from '@/platform/app/shell/artifactShortcuts';

export default function DocumentationEditor({ path }: { path: string }) {
  const me = useMe();
  const editable = canEditSource(path, me);
  const navigate = useNavigate();
  const source = useMemo<SourceAccess>(
    () => ({
      path,
      editable,
      read: () => documentationRequest('read', path),
      write: (content, base) => documentationRequest('write', path, { content, base }),
    }),
    [path, editable],
  );
  const done = (
    <Button
      size='sm'
      variant='outline'
      title={`Return to rendered view (${shortcutLabel('source')})`}
      onClick={() => navigate({ to: '.', search: ((previous: object) => ({ ...previous, mode: undefined })) as never })}
    >
      Done
    </Button>
  );
  return (
    <div className='flex h-full min-h-0 flex-col'>
      <p className='shrink-0 border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground'>
        Shared platform documentation. Changes affect the studio and may also change its Manual chapter. Source access
        follows your contributor permissions.
      </p>
      <SourceEditor key={path} language='markdown' source={source} actions={done} />
    </div>
  );
}
