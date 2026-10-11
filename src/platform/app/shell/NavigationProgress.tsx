import { useEffect, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';

// Preloads and background refreshes do not interrupt the person reading the current page.
export default function NavigationProgress() {
  const navigating = useRouterState({
    select: state => state.isLoading && state.location.href !== state.resolvedLocation?.href,
  });
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!navigating) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(timer);
  }, [navigating]);
  if (!navigating || !visible) return null;
  return (
    <div
      role='status'
      aria-live='polite'
      className='pointer-events-none fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm'
    >
      <LoaderCircle aria-hidden className='size-3.5 animate-spin motion-reduce:animate-none' />
      Opening page
    </div>
  );
}
