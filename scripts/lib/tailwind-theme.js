// System declarations are inventories. Tailwind supplies syntax, never undeclared theme tokens.
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
const semantic =
  /^(?:background|foreground|card(?:-foreground)?|popover(?:-foreground)?|primary(?:-foreground)?|secondary(?:-foreground)?|muted(?:-foreground)?|accent(?:-foreground)?|destructive|border|input|ring|chart-\d+|sidebar(?:-[\w-]+)?)$/;
const themeName =
  /^--(?:color|font|text|tracking|leading|radius|shadow|inset-shadow|drop-shadow|spacing|container|breakpoint|animate|ease|blur|perspective|aspect|default|percentage|animation|max-width)(?:-|$)/;
export function themeInventory(code, themeClass) {
  const base = new Map();
  const modes = new Map();
  const tree = postcss.parse(code);
  tree.walkRules(rule => {
    if (rule.parent.type !== 'root') return;
    const selectors = rule.selector.split(',').map(s => s.trim());
    if (selectors.includes(`.${themeClass}`))
      for (const d of rule.nodes ?? []) if (d.type === 'decl' && d.prop.startsWith('--')) base.set(d.prop, d.value);
    if (selectors.includes(`.${themeClass}[data-color-mode="dark"]`))
      for (const d of rule.nodes ?? []) if (d.type === 'decl' && d.prop.startsWith('--')) modes.set(d.prop, d.value);
  });
  return { base, modes };
}
export function tailwindThemeProblems(code, { file, themeClass, styling }) {
  if (styling !== 'tailwind') return [];
  const { base, modes } = themeInventory(code, themeClass);
  const problems = [];
  for (const [name, value] of [...base, ...modes]) {
    if (!base.has(name))
      problems.push(`${file}: ${name} is only declared in dark mode; declare its base value on .${themeClass}.`);
    if (/^(inherit|unset|revert|revert-layer)$/.test(value))
      problems.push(`${file}: ${name} cannot inherit a theme token from outside the system.`);
    for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (!match[1].startsWith('--tw-') && (match[1] === name || !base.has(match[1])))
        problems.push(`${file}: ${name} references ${match[1]} without an independent declaration on .${themeClass}.`);
    }
  }
  return problems;
}
export function utilityTokens(base) {
  const tokens = new Map();
  for (const [name, value] of base) {
    if (semantic.test(name.slice(2))) tokens.set(`--color-${name.slice(2)}`, { ref: name, value });
    else if (themeName.test(name)) {
      // Upstream @theme aliases must keep the canonical semantic dependency.
      // Otherwise an imported system can make utilities in every other system
      // depend on an alias they intentionally do not declare.
      const alias = value.match(/^var\((--[\w-]+)\)$/)?.[1];
      if (alias && semantic.test(alias.slice(2)) && name === `--color-${alias.slice(2)}` && base.has(alias)) {
        tokens.set(name, { ref: alias, value: base.get(alias) });
      } else tokens.set(name, { ref: name, value });
    }
  }
  return tokens;
}
export function themeAdapter(systems) {
  const tokens = new Map();
  for (const system of systems)
    if (system.styling === 'tailwind')
      for (const [name, entry] of utilityTokens(system.inventory.base)) {
        if (/^--(?:breakpoint|container)-/.test(name) && tokens.has(name) && tokens.get(name).value !== entry.value)
          throw new Error(
            `${name} has different query thresholds across systems. Use unique names or scoped CSS queries.`,
          );
        tokens.set(name, entry);
      }
  const compile = [...tokens].filter(([n]) => /^--(?:breakpoint|container)-/.test(n));
  const runtime = [...tokens].filter(([n]) => !/^--(?:breakpoint|container)-/.test(n));
  return `@theme {\n  --*: initial;\n${compile.map(([n, e]) => `  ${n}: ${e.value};`).join('\n')}\n}\n@theme inline {\n${runtime.map(([n, e]) => `  ${n}: var(${e.ref});`).join('\n')}\n  --default-font-family: var(--font-sans);\n  --default-mono-font-family: var(--font-mono);\n}\n`;
}
// Tailwind implements rounded-full as a built-in literal. Make that named visual
// choice obey the inventory contract just like other radius utilities.
export function inventoryLiterals(rule) {
  let full = false;
  selectorParser(tree =>
    tree.walkClasses(c => {
      if (/(?:^|:)rounded(?:-[a-z]{1,2})?-full$/.test(c.value)) full = true;
    }),
  ).processSync(rule.selector);
  if (full)
    rule.walkDecls(d => {
      if (/^border-.*radius$/.test(d.prop)) d.value = 'var(--radius-full)';
    });
}
// CSS scopes stop utility selectors at other system boundaries, including nested embeds.
// Token resets separately stop custom-property inheritance; scopes alone do not do that.
export function scopeThemeUtilities(code, systems) {
  // Custom-styled prototypes are a boundary without a registered system inventory.
  systems = [
    ...systems,
    {
      role: 'prototype',
      styling: 'custom',
      themeClass: 'prototype-unstyled',
      inventory: { base: new Map(), modes: new Map() },
    },
  ];
  const tree = postcss.parse(code);
  const known = new Set([
    '--radius-full',
    '--default-font-family',
    '--default-mono-font-family',
    ...systems.flatMap(s => [...s.inventory.base.keys()]),
  ]);
  const reset = postcss.atRule({ name: 'layer', params: 'theme' });
  for (const s of systems) {
    const r = postcss.rule({ selector: `.${s.themeClass}` });
    for (const name of known) r.append(postcss.decl({ prop: name, value: 'initial' }));
    for (const name of [
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'line-height',
      'letter-spacing',
      'color',
    ])
      r.append(postcss.decl({ prop: name, value: 'initial' }));
    reset.append(r);
  }
  tree.append(reset);
  tree.walkAtRules('layer', layer => {
    if (layer.params !== 'utilities' || !layer.nodes) return;
    const original = layer.nodes.map(n => n.clone());
    layer.removeAll();
    for (const s of systems) {
      const others = systems
        .filter(o => o.themeClass !== s.themeClass)
        .map(o => `.${o.themeClass}`)
        .join(', ');
      const roots = s.role === 'platform' ? `:root, .${s.themeClass}` : `.${s.themeClass}`;
      const scope = postcss.atRule({ name: 'scope', params: `(${roots})${others ? ` to (${others})` : ''}` });
      const filter = node => {
        if (node.type === 'rule') {
          inventoryLiterals(node);
          const refs = new Set();
          node.walkDecls(d => {
            for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)/g)) if (known.has(m[1])) refs.add(m[1]);
          });
          const variants = new Set();
          selectorParser(sel =>
            sel.walkClasses(c => {
              for (const part of c.value.split(':').slice(0, -1))
                if (known.has(`--breakpoint-${part}`)) variants.add(`--breakpoint-${part}`);
            }),
          ).processSync(node.selector);
          return (
            (s.styling === 'tailwind' || (refs.size === 0 && variants.size === 0)) &&
            [...refs, ...variants].every(n => s.inventory.base.has(n))
          );
        }
        if (node.nodes) {
          for (const child of [...node.nodes]) if (!filter(child)) child.remove();
          return node.nodes.length > 0;
        }
        return true;
      };
      for (const originalNode of original) {
        const node = originalNode.clone();
        if (!filter(node)) continue;
        // An implicit @scope selector starts below the root. Include :scope
        // explicitly so frame utilities also apply on the theme boundary itself.
        const includeRoot = rule => {
          if (rule.parent?.type === 'rule') return;
          const selectors = selectorParser()
            .astSync(rule.selector)
            .nodes.map(n => n.toString());
          rule.selector = [...selectors, ...selectors.map(selector => `:scope:is(${selector})`)].join(', ');
        };
        if (node.type === 'rule') includeRoot(node);
        else if (node.walkRules) node.walkRules(includeRoot);
        scope.append(node);
      }
      if (scope.nodes?.length) layer.append(scope);
    }
  });
  return tree.toString();
}
