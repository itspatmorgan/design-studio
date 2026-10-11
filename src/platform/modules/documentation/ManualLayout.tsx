import DocumentationNavItem from '@/platform/app/docs/DocumentationNavItem';
import { Outlet, getRouteApi } from '@tanstack/react-router';
import { NavGroup, NavList, SectionNav } from '@/platform/app/shell/nav';
import DocumentationHeader from '@/platform/app/docs/DocumentationHeader';
import type { ManualPage } from '@/platform/app/data/types';

const rootApi = getRouteApi('__root__');

// Pages in order, grouped under their `section` headings.
function groupBySection(pages: ManualPage[]) {
  const groups: { section: string | null; pages: ManualPage[] }[] = [];
  for (const page of pages) {
    const last = groups.at(-1);
    if (last && last.section === page.section) last.pages.push(page);
    else groups.push({ section: page.section, pages: [page] });
  }
  return groups;
}

// The Manual: a sidebar of pages (from src/platform/modules/documentation/pages/, via the manifest) and the open page. The
// sidebar is built from the shared navigation pieces (shell/nav/).
export default function ManualLayout() {
  const { manual } = rootApi.useLoaderData();
  return (
    <div className='flex h-full min-h-0'>
      <SectionNav label='Documentation'>
        <DocumentationHeader />
        <NavList>
          {groupBySection(manual).map((g, i) => (
            <NavGroup key={g.section ?? i} heading={g.section ?? undefined}>
              {g.pages.map(page => (
                <DocumentationNavItem
                  key={page.slug}
                  href={page.slug === 'index' ? '/documentation/manual' : '/documentation/manual/' + page.slug}
                  path={'src' + (page.source ?? '/platform/modules/documentation/pages/' + page.slug + '.md')}
                  label={page.title}
                />
              ))}
            </NavGroup>
          ))}
        </NavList>
      </SectionNav>
      <main data-doc-scroll className='relative min-w-0 flex-1 overflow-y-auto'>
        <Outlet />
      </main>
    </div>
  );
}
