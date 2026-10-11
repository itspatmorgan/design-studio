import { Link, getRouteApi } from '@tanstack/react-router';
import { NavHeader, NavTitle, NavTabs, navTabClass } from '@/platform/app/shell/nav';

const rootApi = getRouteApi('__root__');
export default function DocumentationHeader({ reference = false }: { reference?: boolean }) {
  const { manual } = rootApi.useLoaderData();
  return (
    <NavHeader>
      <NavTitle>Documentation</NavTitle>
      <NavTabs label='Documentation sections' wrap>
        {manual.length > 0 && (
          <Link
            to={'/documentation/manual' as never}
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
