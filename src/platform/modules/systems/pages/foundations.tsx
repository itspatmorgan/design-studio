import styles from './theme-docs.module.css';
import { PortalContext } from '@/lib/portal';
import type { ColorMode } from '../spec';
import type { DesignSystem } from '@/platform/app/data/types';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/platform/systems/studio/components/tooltip';
import { KNOWN_COLORS, type ThemeToken } from '@/platform/modules/systems/themeTokens';

// Shared building blocks for the Systems page. Everything here reads live values
// from the CSS at runtime, so it stays true when someone edits a theme file.

// Re-render when the app switches light/dark (the .dark class on <html>).
export function useColorMode() {
  const [mode, setMode] = useState(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  useEffect(() => {
    const html = document.documentElement;
    const obs = new MutationObserver(() => setMode(html.classList.contains('dark') ? 'dark' : 'light'));
    obs.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return mode;
}

// Read a computed style from an element after each render that changes the mode.
export function useComputed<T extends HTMLElement = HTMLDivElement>(
  read: (s: CSSStyleDeclaration) => string,
): [Ref<T>, string | null] {
  const ref = useRef<T>(null);
  const mode = useColorMode();
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    if (ref.current) setValue(read(getComputedStyle(ref.current)));
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, value];
}

// A page's header: title and an optional one-line description.
export function PageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <header className='mb-8'>
      <h1 className='mb-2 text-[26px] font-semibold leading-9 tracking-[-0.01em] text-foreground'>{title}</h1>
      {description && <p className='text-sm text-muted-foreground'>{description}</p>}
    </header>
  );
}

// Introduction metadata stays in sync with the system's declared capabilities.
export function ColorModeSupport({ modes }: { modes: readonly ColorMode[] }) {
  const label = modes.length === 1 ? `${modes[0] === 'light' ? 'Light' : 'Dark'} only` : 'Light and dark';
  const behavior =
    modes.length === 1
      ? `This system stays in ${modes[0]} mode while Studio follows its global color mode.`
      : "Follows Studio's global color mode.";
  return (
    <p>
      <strong className='font-semibold'>Color modes: {label}.</strong> {behavior}
    </p>
  );
}

type Children = { children: ReactNode };

export function Code({ children }: Children) {
  return <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground'>{children}</code>;
}

export function CodeBlock({ children }: Children) {
  return (
    <pre className='overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-[13px] leading-6 text-foreground'>
      {children}
    </pre>
  );
}

export function Prose({ children }: Children) {
  return <div className='max-w-2xl space-y-3 text-sm leading-6 text-foreground/90'>{children}</div>;
}

// --- Colors -----------------------------------------------------------------

// One line per color token: a swatch, its name, what it's for, and its value. A token shadcn/ui
// defines shows its purpose and, on hover, the Tailwind class that uses it; any other just shows
// its name and value.
export function TokenRow({ name, utility, role }: { name: string; utility?: string; role?: string }) {
  const [ref, value] = useComputed(s => s.getPropertyValue(`--${name}`).trim());
  return (
    <div ref={ref} className={styles.colorRow}>
      <div className={styles.swatch} style={{ background: `var(--${name})` }} data-swatch={name} />
      {utility ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <code
                tabIndex={0}
                className='cursor-help truncate text-[13px] text-foreground underline decoration-muted-foreground/50 decoration-dotted underline-offset-4 outline-none focus-visible:decoration-foreground'
              />
            }
          >
            --{name}
          </TooltipTrigger>
          <TooltipContent side='top' className='font-mono text-xs'>
            {utility}
          </TooltipContent>
        </Tooltip>
      ) : (
        <code className='truncate text-[13px] text-foreground'>--{name}</code>
      )}
      <span className='truncate text-[13px] text-muted-foreground'>{role}</span>
      <code
        className='truncate text-right text-[12px] text-muted-foreground'
        data-token={name}
        data-value={value ?? ''}
        title={value ?? ''}
      >
        {value || 'not set'}
      </code>
    </div>
  );
}

// The color tokens in groups: shadcn/ui's first, in their usual order, then any others by the
// group their name gives them (a ramp like blue-500 is "Blue"), then the rest.
const KNOWN_ORDER = ['Surfaces', 'Actions', 'Charts', 'Sidebar'];
function colorGroups(tokens: Pick<ThemeToken, 'name' | 'subgroup'>[]) {
  const groups = new Map<string, string[]>();
  for (const t of tokens) {
    const heading = t.subgroup ?? 'Other colors';
    groups.set(heading, [...(groups.get(heading) ?? []), t.name.slice(2)]);
  }
  const rank = (heading: string) =>
    KNOWN_ORDER.includes(heading) ? KNOWN_ORDER.indexOf(heading) : heading === 'Other colors' ? 99 : 50;
  return [...groups].sort(([a], [b]) => rank(a) - rank(b));
}

// Token rows inherit the selected system's page boundary.
export function ColorTokens({ tokens }: { tokens: ThemeToken[] }) {
  return (
    <div className={styles.sections}>
      {colorGroups(tokens.filter(t => t.group === 'colors')).map(([heading, names]) => (
        <div key={heading}>
          <h3 className={styles.sectionTitle}>{heading}</h3>
          <div className='divide-y divide-border/60'>
            {names.map(name => (
              <TokenRow
                key={name}
                name={name}
                utility={KNOWN_COLORS[name.replace(/^color-/, '')]?.utility}
                role={KNOWN_COLORS[name.replace(/^color-/, '')]?.role}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Icons ------------------------------------------------------------------

export function IconGrid({ icons }: { icons: { name: string; node: ReactNode }[] }) {
  return (
    <div className='grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2'>
      {icons.map(({ name, node }) => (
        <div
          key={name}
          className='flex flex-col items-center gap-2 rounded-lg border border-border p-3 text-foreground'
        >
          {node}
          <span className='w-full truncate text-center font-mono text-[11px] text-muted-foreground'>{name}</span>
        </div>
      ))}
    </div>
  );
}

// --- Components -------------------------------------------------------------

// The Icons page: how to use the system's icon library, and a sample.
export function IconsPage({ icons }: { icons: NonNullable<DesignSystem['icons']> }) {
  return (
    <>
      <div className='mb-4'>
        <CodeBlock>{icons.snippet}</CodeBlock>
      </div>
      <p className='mb-4 text-sm'>
        <a
          href={icons.href}
          target='_blank'
          rel='noreferrer'
          className='font-medium text-foreground underline underline-offset-4'
        >
          Browse all icons
        </a>
      </p>
      <div className='text-foreground'>{icons.grid}</div>
    </>
  );
}

// Pop-ups mount within the example and inherit the selected system's page boundary.
export function SystemFrame({ children }: { children: ReactNode }) {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  return (
    <div className='text-foreground'>
      <PortalContext.Provider value={portal}>{children}</PortalContext.Provider>
      <div ref={setPortal} />
    </div>
  );
}
