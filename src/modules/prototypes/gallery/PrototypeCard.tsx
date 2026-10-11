import { CursorInWindowIcon } from '@hugeicons/core-free-icons';
import { ContributorAvatar } from '@/platform/app/shell/ContributorAvatar';
import { CollectionCard } from '@/platform/app/items/CollectionCard';
import { ItemRow } from '@/platform/app/items/ItemRow';
import { formatDate, prototypeLink } from '@/platform/app/data/manifest';
import type { PrototypeInfo } from '@/platform/app/data/types';
import PrototypeCardMenu from './PrototypeCardMenu';

const nameOf = (p: PrototypeInfo) => p.contributor || p.contributorKey;

// A prototype's card, on the gallery.
export default function PrototypeCard({ prototype: p }: { prototype: PrototypeInfo }) {
  return (
    <CollectionCard
      link={prototypeLink(p)}
      icon={CursorInWindowIcon}
      title={p.title}
      archived={p.status === 'archived'}
      meta={
        <>
          <ContributorAvatar name={nameOf(p)} github={p.contributorGithub} />
          <span className='truncate'>{nameOf(p).split(' ')[0]}</span>
          {p.created && <span>· {formatDate(p.created)}</span>}
        </>
      }
      menu={<PrototypeCardMenu proto={p} />}
    />
  );
}

// A prototype's row, in the gallery's list view and on the front page. `byline` adds who made it.
export function PrototypeRow({
  prototype: p,
  byline = true,
  showCreated = false,
}: {
  prototype: PrototypeInfo;
  byline?: boolean;
  showCreated?: boolean;
}) {
  return (
    <ItemRow
      link={prototypeLink(p)}
      icon={CursorInWindowIcon}
      title={p.title}
      meta={
        byline || (showCreated && p.created) ? (
          <>
            {byline && nameOf(p).split(' ')[0]}
            {showCreated && p.created && (
              <span>
                {byline && ' · '}
                {formatDate(p.created)}
              </span>
            )}
          </>
        ) : undefined
      }
      archived={p.status === 'archived'}
      menu={<PrototypeCardMenu proto={p} inline />}
    />
  );
}
