import { useEffect, useState, type RefObject } from 'react';
import { cn } from '@/lib/utils';

type Heading = { id: string; text: string; level: 2 | 3 };

// "On this page": the document's h2 and h3 headings, highlighting the one you've
// scrolled to. Headings get their ids from rehype-slug.
export function DocToc({ contentRef, watch }: { contentRef: RefObject<HTMLElement | null>; watch: unknown }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = Array.from(contentRef.current?.querySelectorAll<HTMLElement>('h2[id], h3[id]') ?? []);
    setHeadings(els.map(el => ({ id: el.id, text: el.textContent ?? '', level: el.tagName === 'H3' ? 3 : 2 })));
    setActive(els[0]?.id ?? null);
    const scroller = contentRef.current?.closest<HTMLElement>('[data-doc-scroll]');
    if (!scroller || !els.length) return;
    // The active heading is the last one that has scrolled past the top,
    // or the last heading once the page is scrolled to the bottom.
    const onScroll = () => {
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      const top = scroller.getBoundingClientRect().top + 64;
      const passed = els.filter(el => el.getBoundingClientRect().top <= top).at(-1);
      setActive((atBottom ? els.at(-1) : (passed ?? els[0]))!.id);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [contentRef, watch]);

  if (headings.length < 2) return null;
  return (
    <nav aria-label='On this page' className='sticky top-12 hidden w-48 shrink-0 xl:block'>
      <p className='mb-2 text-xs font-semibold text-foreground'>On this page</p>
      <ul className='border-l border-border'>
        {headings.map(h => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={e => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(history.state, '', `#${h.id}`);
              }}
              className={cn(
                '-ml-px block truncate border-l py-1 pr-2 text-[13px] transition-colors',
                h.level === 3 ? 'pl-6' : 'pl-3',
                active === h.id
                  ? 'border-foreground font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
