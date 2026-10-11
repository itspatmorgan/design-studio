import type { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/platform/systems/studio/components/context-menu';
import { FileActionItems } from '@/platform/app/shell/FileActionItems';
import { openRepositoryFile } from '@/platform/app/data/files';
import { navLinkClass, navLinkStyle } from '@/platform/app/shell/nav';

export default function FileNavItem({
  href,
  path,
  label,
  nested = false,
  icon,
  detail,
  className,
  reveal,
}: {
  href: string;
  path: string;
  label: string;
  nested?: boolean;
  icon?: ReactNode;
  detail?: string;
  className?: string;
  reveal: () => Promise<unknown>;
}) {
  const navigate = useNavigate();
  const local = import.meta.env.DEV;
  const rowClass = detail ? navLinkClass + ' group/file-nav focus-visible:bg-sidebar-foreground/5' : navLinkClass;
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Link
          title={path}
          to={href as never}
          activeOptions={{ exact: true, includeSearch: false }}
          style={{ ...navLinkStyle, ...(nested ? { paddingLeft: '1.75rem' } : {}) }}
          className={rowClass + (className ? ' ' + className : '')}
        >
          {icon}
          {detail ? (
            <>
              <span className='min-w-0 flex-1 truncate'>{label}</span>
              <span className='shrink-0 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover/file-nav:opacity-100 group-focus-visible/file-nav:opacity-100'>
                {detail}
              </span>
            </>
          ) : (
            label
          )}
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent className='min-w-44'>
        <FileActionItems
          path={path}
          href={new URL(import.meta.env.BASE_URL.replace(/\/$/, '') + href, window.location.origin).href}
          sourceShortcut={local}
          edit={
            local
              ? () => {
                  void navigate({ to: href as never, search: { mode: 'source' } as never });
                }
              : undefined
          }
          open={local ? () => openRepositoryFile(path) : undefined}
          reveal={local ? reveal : undefined}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}
