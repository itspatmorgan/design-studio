import { canEditSource, useMe } from '@/platform/app/data/files';
import { useMemo } from 'react';
import { Button } from '@/platform/systems/studio/components/button';
import SourceEditor from '@/platform/core/source/SourceEditor';
import type { SourceAccess } from '@/platform/core/source/access';
import { shortcutLabel } from '@/platform/app/shell/artifactShortcuts';
import { systemSourceRequest } from './systemSource';

export default function SystemSourceEditor({ path, onDone }: { path: string; onDone: () => void }) {
  const me = useMe();
  const editable = canEditSource(path, me);
  const source = useMemo<SourceAccess>(
    () => ({
      path,
      editable,
      read: () => systemSourceRequest('read', path),
      write: (content, base) => systemSourceRequest('write', path, { content, base }),
    }),
    [path, editable],
  );
  return (
    <SourceEditor
      source={source}
      language='text'
      actions={
        <Button
          size='sm'
          variant='outline'
          onClick={onDone}
          title={`Return to rendered view (${shortcutLabel('source')})`}
        >
          Done
        </Button>
      }
    />
  );
}
