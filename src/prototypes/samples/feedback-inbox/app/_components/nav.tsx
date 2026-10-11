// Source paths resolve to permanent links through this view's prototype inventory.
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { usePrototypeArtifactHref, useIsPrototypeArtifact } from '@module/prototypes';

export function useScreenPath() {
  return usePrototypeArtifactHref();
}

export function ScreenLink({ to, className, onClick, children }: { to: string; className?: string; onClick?: () => void; children: ReactNode }) {
  const path = useScreenPath()(to);
  return <Link to={path as never} className={className} onClick={onClick}>{children}</Link>;
}

export function useIsOn(screen: string) {
  return useIsPrototypeArtifact(screen);
}
