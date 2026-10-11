import { Link } from '@tanstack/react-router';
import type { PlatformReferenceGroup } from '@/platform/app/data/types';
import { markdownPath } from './referenceLinks';
export const referenceHref = (source: string) => markdownPath(source);

export function AboutReference({ source, group }: { source: string; group?: PlatformReferenceGroup }) {
  const related = group?.references.find(ref => ref.source === source)?.related ?? [];
  return (
    <details className='mt-10 border-t border-border pt-4 text-sm'>
      <summary className='cursor-pointer text-muted-foreground'>About this context</summary>
      <p className='mt-4 break-words font-mono text-xs text-muted-foreground'>src{source}</p>
      <p className='mt-3 text-muted-foreground'>
        This source owns the technical behavior it describes. Context and skills consult it when relevant to a task.
        Availability does not mean an agent has read it.
      </p>
      {Boolean(related.length) && (
        <>
          <p className='mt-4 font-medium'>Related operating instructions and intent</p>
          <ul className='mt-2 space-y-2'>
            {related.map(link => (
              <li key={link.href}>
                <Link to={link.href as never} className='underline underline-offset-4'>
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
