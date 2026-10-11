import { createLoader } from '@/platform/app/data/createLoader';
import type { MarkdownModule } from '@/platform/app/docs/markdownFileModule';

// The build supplies this module's files from its file-type scopes.
export const documents = createLoader<MarkdownModule>(
  import.meta.glob<MarkdownModule>(['/__studio_globs__/*']),
  import.meta.hot,
);

if (import.meta.hot) import.meta.hot.accept();
