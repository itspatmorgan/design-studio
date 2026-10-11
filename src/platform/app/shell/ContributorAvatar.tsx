import { Avatar, AvatarImage, AvatarFallback } from '@/systems/studio/components/avatar';

// GitHub photos enhance the byline; initials remain available offline or after a failed load.
export function ContributorAvatar({
  name,
  github,
  size = 'sm',
}: {
  name?: string;
  github?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const initials = name?.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';
  const account = github?.trim();
  const photo =
    account && /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(account)
      ? `https://github.com/${encodeURIComponent(account)}.png?size=80`
      : undefined;
  return (
    <Avatar size={size} aria-hidden>
      {photo && <AvatarImage key={photo} src={photo} alt='' referrerPolicy='no-referrer' />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
