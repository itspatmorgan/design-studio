import { createMarkdownLoader } from '@/platform/app/docs/createMarkdownLoader';
import type { MDXContent } from 'mdx/types';
import type { DocFrontmatter } from '@/platform/app/docs/types';

export type ManualModule = { default: MDXContent; frontmatter?: DocFrontmatter };

// Human chapters live only in the Manual folder. Vite loads a chapter on demand.
const glob = import.meta.glob<ManualModule>('/platform/modules/documentation/pages/*.md');

const load = createMarkdownLoader(glob, import.meta.hot);

export function loadManualPage(slug: string, source?: string) {
  return load(source ?? `/platform/modules/documentation/pages/${slug}.md`);
}

if (import.meta.hot) import.meta.hot.accept();
