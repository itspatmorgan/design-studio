import { useEffect, useState } from 'react';
import type { EmbedProps } from '@/platform/app/data/fileTypeModule';
import Diagram from './Diagram';
import { loadDiagram } from './load';

type Loaded = NonNullable<Awaited<ReturnType<typeof loadDiagram>>>;
export default function DiagramEmbed({ proto, item, width, height }: EmbedProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoaded(null);
    setError(false);
    loadDiagram({ proto, item }).then(
      result => {
        if (active) {
          setLoaded(result ?? null);
          setError(!result);
        }
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [proto, item]);
  return (
    <div style={{ width, height }} className='overflow-hidden'>
      {loaded ? (
        <Diagram {...loaded} compact />
      ) : (
        <p role={error ? 'alert' : 'status'} className='p-4 text-xs text-muted-foreground'>
          {error ? 'This diagram could not load. Open it to inspect its source.' : 'Loading diagram…'}
        </p>
      )}
    </div>
  );
}
