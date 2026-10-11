import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Search, X, FileText, NotebookText, WandSparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/platform/systems/studio/components/collapsible';
import { Input } from '@/platform/systems/studio/components/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/platform/systems/studio/components/tooltip';
import { Link, Outlet, useParams, useRouterState } from '@tanstack/react-router';
import { useManifest } from '@/platform/app/data/useManifest';
import { contentId, SYSTEM_CONTENT_SECTIONS } from '@/platform/core/roots';
import { artifactLabel, artifactLink } from '@/platform/app/data/manifest';
import { SectionNav, NavList } from '@/platform/app/shell/nav';
import FileNavItem from '@/platform/app/shell/FileNavItem';
import { repoPath, revealInFinder } from '@/platform/app/data/files';
import SystemContentPage from '@/modules/systems/content/SystemContentPage';
import DocumentationHeader from './DocumentationHeader';
import DocumentationNavItem from './DocumentationNavItem';
import { markdownPath } from './referenceLinks';
import { NotFound } from '@/platform/app/shell/App';

const guidanceExpansion = new Map<string, boolean>();

function GuidanceSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className='space-y-0.5 [&+section]:mt-4'>
      <h2 className='flex h-7 items-center px-3 text-[12px] font-semibold text-muted-foreground'>{label}</h2>
      {children}
    </section>
  );
}

function GuidanceBranch({
  label,
  path,
  active = false,
  defaultExpanded = false,
  searching = false,
  children,
}: {
  label: string;
  path: string;
  active?: boolean;
  defaultExpanded?: boolean;
  searching?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => guidanceExpansion.get(path) ?? (active || defaultExpanded));
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);
  useEffect(() => {
    guidanceExpansion.set(path, open);
  }, [path, open]);
  return (
    <Collapsible open={searching || open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        title={path}
        className='mx-1 flex h-7 w-[calc(100%-8px)] items-center gap-1.5 rounded-md px-2 text-left text-[12px] font-medium hover:bg-sidebar-foreground/5'
      >
        <ChevronDown
          aria-hidden='true'
          className={
            'size-3.5 shrink-0 text-muted-foreground transition-transform ' + (searching || open ? '' : '-rotate-90')
          }
        />
        <span className='truncate'>{label}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className='space-y-0.5 pl-3'>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export default function KnowledgePage() {
  const id = useRouterState({
    select: state => (state.matches.at(-1)?.params as { owner?: string } | undefined)?.owner,
  });
  const manifest = useManifest();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  const q = query.trim().toLowerCase();
  const matches = (label: string) => !q || label.toLowerCase().includes(q);
  const owners = [
    ...new Map(
      manifest.systemContent.filter(p => p.owner && p.owner.kind !== 'system').map(p => [p.owner!.id, p.owner!]),
    ).values(),
  ];
  const references = (root: string) =>
    manifest.platformReferences.flatMap(g => g.references).filter(r => r.source.startsWith('/' + root.slice(4) + '/'));
  const ownerTree = (navOwner: (typeof owners)[number]) => {
    const ownerMatch =
      matches(navOwner.label) || matches(navOwner.root) || (navOwner.kind === 'module' && matches('Modules'));
    const docs = references(navOwner.root).filter(r => ownerMatch || matches(r.title) || matches(r.source));
    const entries = manifest.systemContent
      .filter(proto => proto.owner?.id === navOwner.id)
      .flatMap(proto =>
        proto.artifacts
          .filter(a => proto.title !== 'Skills' || /^[^/]+\/SKILL\.md$/.test(a.path))
          .map(item => ({
            proto,
            item,
            label: artifactLabel(item.path, proto),
            kind: proto.title === 'Skills' ? 'Skill' : 'Context',
          })),
      )
      .filter(
        ({ proto, item, label, kind }) =>
          ownerMatch || matches(kind) || matches(label) || matches(repoPath(proto, item.path)),
      )
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
    if (q && !docs.length && !entries.length) return null;
    const content = (
      <>
        {docs.map(r => (
          <DocumentationNavItem
            key={r.source}
            href={markdownPath(r.source)}
            path={'src' + r.source}
            label={r.source.endsWith('/README.md') ? 'README' : r.title}
            icon={<FileText aria-hidden='true' className='size-3.5 shrink-0 text-muted-foreground' />}
            detail='Document'
          />
        ))}
        {entries.map(({ proto, item, label, kind }) => {
          const Icon = kind === 'Skill' ? WandSparkles : NotebookText;
          return (
            <FileNavItem
              key={proto.id + '/' + item.path}
              href={(artifactLink(proto, item) as { to: string }).to}
              path={repoPath(proto, item.path)}
              label={label}
              detail={kind}
              icon={<Icon aria-hidden='true' className='size-3.5 shrink-0 text-muted-foreground' />}
              reveal={async () => {
                revealInFinder(proto, item.path);
              }}
            />
          );
        })}
      </>
    );
    return navOwner.kind === 'platform' ? (
      <GuidanceSection key={navOwner.id} label={navOwner.label}>
        {content}
      </GuidanceSection>
    ) : (
      <GuidanceBranch
        key={navOwner.id}
        label={navOwner.label}
        path={navOwner.root + '/'}
        active={id === navOwner.id}
        searching={Boolean(q)}
      >
        {content}
      </GuidanceBranch>
    );
  };
  const platformBranches = owners
    .filter(o => o.kind === 'platform')
    .map(ownerTree)
    .filter(Boolean);
  const moduleBranches = owners
    .filter(o => o.kind === 'module')
    .map(ownerTree)
    .filter(Boolean);
  return (
    <div className='flex min-h-0 flex-1'>
      <SectionNav label='Documentation'>
        <DocumentationHeader reference />
        <div className='shrink-0 px-3 pt-3'>
          <div className='flex h-7 items-center justify-between pl-2'>
            <p className='text-[12px] font-semibold'>Resources</p>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    aria-label='Search'
                    aria-pressed={searchOpen}
                    onClick={() => {
                      setSearchOpen(open => !open);
                      setQuery('');
                    }}
                    className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-foreground/5'
                  />
                }
              >
                <Search className='size-3.5' />
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
          </div>
          {searchOpen && (
            <div className='relative mt-1'>
              <Input
                ref={searchRef}
                aria-label='Search context and skills'
                placeholder='Search context and skills'
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    if (query) setQuery('');
                    else setSearchOpen(false);
                  }
                }}
                className='h-8 pr-8 text-[13px] shadow-none'
              />
              {query && (
                <button
                  type='button'
                  aria-label='Clear search'
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  className='absolute right-1 top-0.5 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground'
                >
                  <X className='size-3.5' />
                </button>
              )}
            </div>
          )}
        </div>
        <NavList>
          {platformBranches}
          {moduleBranches.length > 0 && <GuidanceSection label='Modules'>{moduleBranches}</GuidanceSection>}
          {!platformBranches.length && !moduleBranches.length && (
            <p className='px-3 py-2 text-[13px] text-muted-foreground'>No matching resources</p>
          )}
        </NavList>
      </SectionNav>
      <main className='flex min-h-0 min-w-0 flex-1 flex-col'>
        <Outlet />
      </main>
    </div>
  );
}

export function KnowledgeDocument() {
  const {
    owner: id,
    page,
    _splat: slug,
  } = useParams({ strict: false }) as { owner?: string; page?: string; _splat?: string };
  const manifest = useManifest();
  const owner = manifest.systemContent.find(p => p.owner?.id === id)?.owner;
  const sections = manifest.systemContent.filter(p => p.owner?.id === id);
  const data = useRouterState({ select: state => state.matches.at(-1)?.loaderData }) as
    | { contentData?: import('@/modules/systems/content/SystemContentPage').ContentData }
    | undefined;
  const selected = sections.find(p => p.id === contentId(id ?? '', page ?? ''));
  if (!owner || (page && page !== 'reference' && !selected)) return <NotFound />;
  return selected ? (
    <SystemContentPage key={selected.id + '/' + (slug ?? '')} proto={selected} slug={slug} data={data?.contentData} />
  ) : (
    <div className='overflow-y-auto px-8 py-10'>
      <div className='mx-auto max-w-3xl'>
        <h1 className='text-3xl font-semibold'>{owner.label}</h1>
        <p className='mt-3 text-muted-foreground'>
          {owner.kind === 'platform'
            ? 'Shared knowledge and workflows for operating Design Studio.'
            : `Knowledge and workflows supplied by this ${owner.kind}.`}
        </p>
        {Object.entries(SYSTEM_CONTENT_SECTIONS).map(([section, spec]) => {
          const proto = sections.find(p => p.id === contentId(owner.id, section));
          const entries = proto?.artifacts.filter(a => section !== 'skills' || /^[^/]+\/SKILL\.md$/.test(a.path)) ?? [];
          return (
            <section key={section} className='mt-8'>
              <h2 className='text-lg font-semibold'>{spec.title}</h2>
              <p className='mt-2 text-sm text-muted-foreground'>{spec.description}</p>
              <ul className='mt-3 space-y-2'>
                {entries.map(a => (
                  <li key={a.path}>
                    <Link
                      to={`/documentation/context/${id}/${section}/${a.path.replace(/\.md$/, '')}` as never}
                      className='text-sm hover:underline'
                    >
                      {section === 'skills' ? artifactLabel(a.path.split('/')[0]) : artifactLabel(a.path)}
                    </Link>
                  </li>
                ))}
              </ul>
              {!entries.length && (
                <p className='mt-3 text-sm text-muted-foreground'>No {spec.title.toLowerCase()} added.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
