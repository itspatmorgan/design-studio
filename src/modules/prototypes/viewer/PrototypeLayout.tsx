// The layout of a prototype, or of the system content: its navigation (which hides with the rail's toggle,
// or ⌘;) beside the open item. The route (router.tsx) passes in the prototype it loaded.
import { Outlet, useParams, useRouterState } from '@tanstack/react-router';
import { findArtifact, firstArtifact } from '@/platform/app/data/manifest';
import type { Prototype } from '@/platform/app/data/types';
import PrototypeNav from '@/modules/prototypes/viewer/PrototypeNav';
import { isStandalone } from '@/platform/app/data/modules';

export default function PrototypeLayout({ proto }: { proto: Prototype }) {
  const params = useParams({ strict: false });
  const openPath = useRouterState({
    select: state => (state.matches.at(-1)?.loaderData as { artifactPath?: string } | undefined)?.artifactPath,
  });
  // The index keeps the currently displayed artifact during an order update.
  const current = params.artifact
    ? proto.artifacts.find(item => item.studioId === params.artifact)
    : params._splat
      ? findArtifact(proto, params._splat)
      : (proto.artifacts.find(item => item.path === openPath) ?? firstArtifact(proto));
  // A standalone section item on the deployed site is just the open item, filling the window (App.tsx hides the rail too).
  if (!import.meta.env.DEV && isStandalone(proto.contributorKey))
    return (
      <div className='flex min-h-0 flex-1'>
        <Outlet />
      </div>
    );
  return (
    <div className='flex min-h-0 flex-1'>
      <PrototypeNav proto={proto} current={current} />
      <Outlet />
    </div>
  );
}
