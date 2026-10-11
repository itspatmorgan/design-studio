import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { MDXContent } from 'mdx/types';
import { DocToc } from '@/platform/app/docs/DocToc';
import { Prose } from '@/platform/app/docs/Prose';

// scrollKey: what the page is. It scrolls to the top or to a heading when this changes, not when
// only the content does (a document edited while it's open keeps its place). Defaults to Component.
type DocLayoutProps = {
  Component: MDXContent;
  title?: string;
  description?: string;
  toc?: boolean;
  scrollKey?: string;
  footer?: ReactNode;
  actions?: ReactNode;
};

// A Markdown document: title and description from its frontmatter, the content,
// and an "On this page" list when the frontmatter says `toc: true`.
export function DocLayout({ Component, title, description, toc, scrollKey, footer, actions }: DocLayoutProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Open at the heading in the URL (/documentation/manual/prototypes#how-do-i-organize-artifacts), or at the top.
  useLayoutEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView({ block: 'start' });
    else contentRef.current?.closest('[data-doc-scroll]')?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey ?? Component]);

  return (
    <div className='mx-auto flex max-w-5xl items-start justify-center gap-12 px-8 pt-12 pb-24'>
      <article ref={contentRef} className='min-w-0 max-w-[65ch] flex-1'>
        {(title || description) && (
          <header className='mb-10'>
            <div className='mb-3 flex items-start justify-between gap-4'>
              {title && <h1 className='text-3xl font-semibold tracking-tight text-foreground'>{title}</h1>}
              {actions}
            </div>
            {description && <p className='text-base leading-relaxed text-muted-foreground'>{description}</p>}
          </header>
        )}
        <Prose>
          <Component />
        </Prose>
        {footer}
      </article>
      {toc && <DocToc contentRef={contentRef} watch={Component} />}
    </div>
  );
}
