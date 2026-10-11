// A prototype system's tokens, worked out from its theme.css so the Systems pages can list
// whatever the theme defines without anyone writing a spec: colors, fonts, radii, shadows,
// spacing, and the rest. It reads the custom properties set under the system's class
// (`.product-theme`, and `.product-theme[data-color-mode="dark"]` for dark mode) and in any `@theme` block, and
// sorts each into a group by its name and value. The pages read the values live, so they follow the
// color mode and can't go stale; the declared value is kept for a token the browser doesn't hold.
// Nothing here reads a disk or imports anything, so Node scripts and the app can both load it.

export type TokenGroup = 'colors' | 'typography' | 'radius' | 'shadows' | 'spacing' | 'motion' | 'effects' | 'other';

export type ThemeToken = {
  name: string; // "--primary"
  value: string; // as the theme writes it, for when the browser has no value of its own (an @theme inline one)
  group: TokenGroup;
  subgroup: string | null; // colors only: "Surfaces", "Blue", ... (null: no name to give it)
  dark: boolean; // it has its own dark value
};

// shadcn/ui's semantic color tokens: the group each belongs to, and what it is for.
type KnownColor = { group: string; role: string; utility: string };
const KNOWN_GROUPS: [group: string, tokens: [name: string, utility: string, role: string][]][] = [
  [
    'Surfaces',
    [
      ['background', 'bg-background', 'Page background'],
      ['foreground', 'text-foreground', 'Primary text'],
      ['card', 'bg-card', 'Card surfaces'],
      ['card-foreground', 'text-card-foreground', 'Text on cards'],
      ['popover', 'bg-popover', 'Menus and dialogs'],
      ['popover-foreground', 'text-popover-foreground', 'Text on popovers'],
      ['muted', 'bg-muted', 'Muted backgrounds'],
      ['muted-foreground', 'text-muted-foreground', 'Secondary text'],
      ['accent', 'bg-accent', 'Hover and focus highlights'],
      ['accent-foreground', 'text-accent-foreground', 'Text on accent'],
      ['secondary', 'bg-secondary', 'Secondary surfaces'],
      ['secondary-foreground', 'text-secondary-foreground', 'Text on secondary'],
      ['border', 'border-border', 'Borders and dividers'],
      ['input', 'border-input', 'Input borders'],
      ['ring', 'ring-ring', 'Focus rings'],
    ],
  ],
  [
    'Actions',
    [
      ['primary', 'bg-primary', 'Primary actions'],
      ['primary-foreground', 'text-primary-foreground', 'Text on primary'],
      ['destructive', 'bg-destructive', 'Destructive actions'],
    ],
  ],
  [
    'Charts',
    [1, 2, 3, 4, 5].map((n): [string, string, string] => [`chart-${n}`, `bg-chart-${n}`, `Chart series ${n}`]),
  ],
  [
    'Sidebar',
    [
      ['sidebar', 'bg-sidebar', 'Sidebar background'],
      ['sidebar-foreground', 'text-sidebar-foreground', 'Sidebar text'],
      ['sidebar-primary', 'bg-sidebar-primary', 'Sidebar primary'],
      ['sidebar-primary-foreground', 'text-sidebar-primary-foreground', 'Text on sidebar primary'],
      ['sidebar-accent', 'bg-sidebar-accent', 'Sidebar hover'],
      ['sidebar-accent-foreground', 'text-sidebar-accent-foreground', 'Sidebar accent text'],
      ['sidebar-border', 'border-sidebar-border', 'Sidebar border'],
      ['sidebar-ring', 'ring-sidebar-ring', 'Sidebar focus ring'],
    ],
  ],
];
export const KNOWN_COLORS: Record<string, KnownColor> = Object.fromEntries(
  KNOWN_GROUPS.flatMap(([group, tokens]) =>
    tokens.map(([name, utility, role]): [string, KnownColor] => [name, { group, role, utility }]),
  ),
);

const NAME = /^--[a-z0-9_-]+$/i;

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

type Block = { selector: string; body: string };

// The blocks at the top level of some CSS, each as its selector (or at-rule) and what is inside its braces.
function blocksOf(css: string): Block[] {
  const out: Block[] = [];
  let depth = 0;
  let start = 0;
  let selectorFrom = 0;
  let selector = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      if (depth === 0) {
        selector = css.slice(selectorFrom, i).replace(/\s+/g, ' ').trim();
        start = i + 1;
      }
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        out.push({ selector, body: css.slice(start, i) });
        selectorFrom = i + 1;
      }
      if (depth < 0) depth = 0;
    } else if (c === ';' && depth === 0) {
      selectorFrom = i + 1; // an at-rule with no block, like @import
    }
  }
  return out;
}

// The custom properties a block sets directly (not in blocks nested inside it), in order.
function declarationsOf(body: string): [name: string, value: string][] {
  let top = '';
  let depth = 0;
  for (const c of body) {
    if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0) top += c;
  }
  const out: [string, string][] = [];
  for (const part of top.split(';')) {
    const m = part.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m && NAME.test(m[1])) out.push([m[1], m[2].replace(/\s+/g, ' ')]);
  }
  return out;
}

const COLOR_VALUE =
  /^(#[0-9a-f]{3,8}$|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(|(?:transparent|currentcolor|white|black)$)/i;

function isColor(value: string, values: Map<string, string>, depth = 0): boolean | null {
  const v = value.trim();
  if (COLOR_VALUE.test(v)) return true;
  const ref = v.match(/^var\(\s*(--[\w-]+)/);
  if (!ref) return false;
  const target = values.get(ref[1]);
  return target === undefined || depth > 5 ? null : isColor(target, values, depth + 1); // null: defined somewhere we can't see
}

function colorSubgroup(name: string): string | null {
  const bare = name.slice(2).replace(/^color-/, '');
  if (KNOWN_COLORS[bare]) return KNOWN_COLORS[bare].group;
  const ramp = bare.match(/^(.+?)-(\d{1,3})$/); // blue-500, gray-50
  return ramp ? ramp[1].replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()) : null;
}

function groupOf(name: string, value: string, values: Map<string, string>): TokenGroup {
  const n = name.slice(2);
  const color = isColor(value, values);
  if (color || (color === null && n.startsWith('color-'))) return 'colors';
  if (/^radius(-|$)/.test(n)) return 'radius';
  if (/^(shadow|text-shadow|drop-shadow|inset-shadow|elevation)(-|$)/.test(n)) return 'shadows';
  if (/^(spacing|space|gap|container|size)(-|$)/.test(n)) return 'spacing';
  if (/^(animate|ease|default-transition)(-|$)/.test(n)) return 'motion';
  if (/^(blur|perspective|aspect)(-|$)/.test(n)) return 'effects';
  if (/^(font|text|leading|tracking|line-height|letter-spacing)(-|$)/.test(n)) return 'typography';
  return 'other';
}

// The tokens a theme defines, in the order they first appear. `scope` is the system's class, like
// "product-theme", or the selectors that hold its light and dark values (":root" and ".dark", for
// a theme set on the page itself).
export function themeTokens(css: string, scope: string | { light: string; dark: string }): ThemeToken[] {
  const where = typeof scope === 'string' ? { light: `.${scope}`, dark: `.${scope}[data-color-mode="dark"]` } : scope;
  const light = new Map<string, string>();
  const dark = new Set<string>();
  const darkValues = new Map<string, string>();
  const visit = (blocks: Block[]) => {
    for (const { selector, body } of blocks) {
      if (selector.startsWith('@theme')) {
        for (const [n, v] of declarationsOf(body)) light.set(n, v);
        continue;
      }
      if (selector.startsWith('@')) {
        visit(blocksOf(body));
        continue;
      } // @media, @layer, ...
      const selectors = selector.split(',').map(s => s.trim());
      if (selectors.includes(where.light)) for (const [n, v] of declarationsOf(body)) light.set(n, v);
      if (selectors.includes(where.dark))
        for (const [n, v] of declarationsOf(body)) {
          dark.add(n);
          darkValues.set(n, v);
        }
    }
  };
  visit(blocksOf(stripComments(css)));
  // A token only the dark block sets still counts (its light value is the app's).
  const values = new Map([...darkValues, ...light]);
  const tokens: ThemeToken[] = [];
  for (const [name, value] of values) {
    // "--color-primary: var(--primary)" repeats "--primary" under the name Tailwind wants: list it once.
    const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)?.[1];
    if (alias && name === `--color-${alias.slice(2)}` && values.has(alias)) continue;
    const group = groupOf(name, value, values);
    tokens.push({
      name,
      value,
      group,
      subgroup: group === 'colors' ? colorSubgroup(name) : null,
      dark: dark.has(name),
    });
  }
  return tokens;
}
