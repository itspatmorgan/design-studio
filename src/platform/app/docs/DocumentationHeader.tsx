import { Link, getRouteApi } from '@tanstack/react-router';
import { NavHeader, NavTitle, NavTabs, navTabClass } from '@/platform/app/shell/nav';

import { moduleApps } from '@/platform/app/modules';

const rootApi = getRouteApi('__root__');
export default function DocumentationHeader({ reference = false }: { reference?: boolean }) {
  const manifest = rootApi.useLoaderData();
  const manualHref = moduleApps.find(({ spec }) => spec.id === 'documentation')?.app.landing?.(manifest);
  return (
    <NavHeader>
      <NavTitle>Documentation</NavTitle>
      <NavTabs label='Documentation sections' wrap>
        {manualHref && (
          <Link
            to={manualHref as never}
            aria-current={!reference ? 'page' : undefined}
            className={navTabClass(!reference)}
          >
            Manual
          </Link>
        )}
        <Link
          to={'/documentation/context/platform.core' as never}
          aria-current={reference ? 'page' : undefined}
          className={navTabClass(reference)}
        >
          Context &amp; Skills
        </Link>
      </NavTabs>
    </NavHeader>
  );
}
