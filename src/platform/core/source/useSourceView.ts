import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useSourceShortcut } from './useSourceShortcut';

// Every file surface uses the same URL state, shortcut, and return focus.
export function useSourceView(enabled: boolean, source: boolean) {
  const navigate = useNavigate();
  const rendered = useRef<HTMLDivElement>(null);
  const wasSource = useRef(source);
  const toggle = () => {
    void navigate({
      to: '.',
      search: ((previous: object) => ({ ...previous, mode: source ? undefined : 'source' })) as never,
    });
  };
  useSourceShortcut(enabled, source, toggle);
  useEffect(() => {
    if (wasSource.current && !source) rendered.current?.focus();
    wasSource.current = source;
  }, [source]);
  return { toggle, rendered };
}
