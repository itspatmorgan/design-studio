import type { CSSProperties } from 'react';
import { contentPalette } from '@/platform/systems/studio/styles/contentPalette';

// Keep colors in CSS so Studio's tokens retain their native color space.
export function diagramTheme(dark: boolean): CSSProperties {
  const p = contentPalette[dark ? 'dark' : 'light'];
  return {
    '--pele-bg': 'var(--card)',
    '--pele-fg': 'var(--foreground)',
    '--pele-muted': 'var(--muted-foreground)',
    '--pele-surface': 'var(--muted)',
    '--pele-surface-alt': 'var(--card)',
    '--pele-border': dark ? 'color-mix(in srgb, var(--card), var(--foreground) 45%)' : 'var(--border)',
    '--pele-line': dark ? 'color-mix(in srgb, var(--card), var(--foreground) 65%)' : 'var(--muted-foreground)',
    '--pele-accent': p.blue,
    '--pele-critical': p.red,
    '--pele-error': p.red,
    ...Object.fromEntries(
      [p.blue, p.cyan, p.orange, p.purple, p.green, p.magenta, p.yellow, p.red].map((color, i) => [
        `--pele-series-${i + 1}`,
        color,
      ]),
    ),
  } as CSSProperties;
}
