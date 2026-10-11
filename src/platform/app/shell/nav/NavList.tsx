// A flat list of pages in a section's navigation, in groups under headings: the Systems pages and
// any module's pages. (A list of files and folders is the file tree, FileTree.tsx.) Presentational only:
// each row is a router Link that takes navLinkClass, so the row looks like the tree's.
//   <NavList>
//     <NavGroup>                          a group with no heading
//       <Link className={navLinkClass} …>Introduction</Link>
//     <NavGroup heading="Theme">…
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { navIndent, navRow, navRowState } from '@/platform/app/shell/nav/navRow';

// The scrolling body under the header.
export function NavList({ children }: { children: ReactNode }) {
  return <div className='min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pt-3 pb-3'>{children}</div>;
}

export function NavGroup({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <div className='mt-4 space-y-0.5 first:mt-0'>
      {/* The heading's text starts where a row's text does (same margin and indent), so with no icons in
          the rows the two line up. */}
      {heading && (
        <p
          style={navIndent(0)}
          className='mx-1 pt-1 pb-1.5 pr-1.5 text-[12px] font-semibold leading-none text-sidebar-foreground'
        >
          {heading}
        </p>
      )}
      {children}
    </div>
  );
}

// A page link's look. The router marks the open page with data-status="active" (give the Link
// activeOptions={{ exact: true }} for a page whose address is a prefix of others).
export const navLinkClass = cn(
  navRow,
  navRowState(false),
  // Selected rows keep their surface when hovered, instead of dipping to the quieter hover color.
  'data-[status=active]:bg-sidebar-foreground/10 data-[status=active]:hover:bg-sidebar-foreground/10 data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground',
);
export const navLinkStyle: CSSProperties = navIndent(0);
