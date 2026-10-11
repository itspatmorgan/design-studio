import type { ReactNode } from 'react';

// The grid of cards on a collection's index (/prototypes, /examples, ...), so each looks like the others. Its
// children are <li>s, one card each; a module draws its own cards.
export function ItemGrid({ children }: { children: ReactNode }) {
  return <ul className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>{children}</ul>;
}
