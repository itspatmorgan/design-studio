import { useEffect, useState, type ComponentType } from 'react';
import type { MDXContent } from 'mdx/types';
import { SYSTEMS_KEY } from '@/platform/core/roots';
import { exampleNames, type ComponentPropsDoc, type SystemComponentDoc } from '@/modules/systems/docs';

// A component's docs files in a system (src/systems/<system>/components/, or src/systems/studio/components/; see
// src/modules/systems/docs.ts): its examples, the examples file's text, and its Markdown page.
export type Example = { name: string; Component: ComponentType };

// Vite only loads a file when it is asked for.
// The app's own system (Studio) keeps its components in /systems/studio/components/.
const globs = {
  examples: import.meta.glob<Record<string, unknown>>(['/systems/*/components/**/*.examples.{tsx,jsx}']),
  sources: import.meta.glob<string>(['/systems/*/components/**/*.examples.{tsx,jsx}'], {
    query: '?raw',
    import: 'default',
  }),
  docs: import.meta.glob<{ default: MDXContent }>(['/systems/*/components/**/*.md']),
};

// In dev, adding or removing a file makes Vite run this file again with new lists. The app keeps
// calling the functions from the first run, so the lists live in state Vite keeps across runs
// (like loadManual.ts).
const state: { globs: typeof globs; listeners: Set<() => void> } = import.meta.hot?.data.state ?? {
  globs,
  listeners: new Set(),
};

const at = (system: string, file: string) => `${`/systems/${system}`}/components/${file}`;

// The examples an examples file exports: each export named with a capital that is a component,
// in the order the file lists them (a module's exports come alphabetically).
export async function loadExamples(system: string, file: string): Promise<Example[]> {
  const [module, source] = await Promise.all([
    state.globs.examples[at(system, file)]?.(),
    state.globs.sources[at(system, file)]?.(),
  ]);
  if (!module || source === undefined) throw new Error(`Couldn't load the examples in ${file}.`);
  const order = exampleNames(source ?? '');
  const rank = (name: string) => {
    const i = order.indexOf(name);
    return i < 0 ? order.length : i;
  };
  return Object.entries(module)
    .filter(([name, value]) => /^[A-Z]/.test(name) && typeof value === 'function')
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([name, value]) => ({ name, Component: value as ComponentType }));
}

export const loadExamplesSource = (system: string, file: string) => state.globs.sources[at(system, file)]?.();
export const loadComponentDoc = async (system: string, file: string) =>
  (await state.globs.docs[at(system, file)]?.())?.default;

// A number that changes when a docs file is edited, added, or removed while the app runs, so a
// page showing one loads it again.
export function useDocsVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    // A component's own file changing doesn't re-run this module, but its props may have changed.
    const onFile = (change: { contributor: string }) => {
      if (change.contributor === SYSTEMS_KEY) bump();
    };
    state.listeners.add(bump);
    import.meta.hot?.on('studio:file', onFile);
    return () => {
      state.listeners.delete(bump);
      import.meta.hot?.off('studio:file', onFile);
    };
  }, []);
  return version;
}

// The props of the components a file exports, read from the code (src/modules/systems/node/props-plugin.js).
// While the app runs, the dev server reads them fresh, so an edit to a component shows; the
// built site has them in a module made at build time.
export async function loadProps(system: string, file: string): Promise<ComponentPropsDoc[]> {
  const all = import.meta.env.DEV
    ? await fetch('/__studio/system-props').then(response => {
        if (!response.ok) throw new Error("Couldn't load component props.");
        return response.json() as Promise<Record<string, ComponentPropsDoc[]>>;
      })
    : (await import('virtual:system-props')).default;
  return all[`${system}/${file}`] ?? [];
}

if (import.meta.hot) {
  import.meta.hot.data.state = state;
  state.globs = globs;
  state.listeners.forEach(notify => notify());
  import.meta.hot.accept();
}

// Resolve every section before the router publishes the next component page.
// Failures stay reviewable alongside successfully loaded sections.
export type ComponentPageData = {
  doc?: MDXContent;
  examples?: Example[];
  source?: string;
  props?: ComponentPropsDoc[];
  errors: string[];
};
export async function loadComponentPage(system: string, component: SystemComponentDoc): Promise<ComponentPageData> {
  const data: ComponentPageData = { errors: [] };
  const { doc, examples, source } = component.files;
  const requests: [Exclude<keyof ComponentPageData, 'errors'>, () => Promise<unknown> | undefined][] = [];
  if (doc) requests.push(['doc', () => loadComponentDoc(system, doc)]);
  if (examples)
    requests.push(
      ['examples', () => loadExamples(system, examples)],
      ['source', () => loadExamplesSource(system, examples)],
    );
  if (source) requests.push(['props', () => loadProps(system, source)]);
  await Promise.all(
    requests.map(async ([key, load]) => {
      try {
        const value = await load();
        if (value === undefined) throw new Error('The file is missing.');
        Object.assign(data, { [key]: value });
      } catch (error) {
        data.errors.push(`${key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
  );
  return data;
}
