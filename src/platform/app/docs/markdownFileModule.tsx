// Shared Markdown file reader for independently owned content scopes.
import { lazyRouteComponent } from '@tanstack/react-router';
import { File01Icon } from '@hugeicons/core-free-icons';
import type { FileTypeModule } from '@/platform/app/data/fileTypeModule';
import { artifactFolder, artifactSlug } from '@/platform/app/data/manifest';
import { addressOf, SYSTEM_CONTENT_KEY, rootOf } from '@/platform/core/roots';
import type { createLoader } from '@/platform/app/data/createLoader';
import type { MDXContent } from 'mdx/types';
import type { DocFrontmatter } from './types';

export type MarkdownModule = { default: MDXContent; frontmatter?: DocFrontmatter };

// Loaded with the first document, so the reader (Markdown provider, table of contents) isn't in
// the main bundle.
const preload = () => import('./MarkdownPage');
const MarkdownPage = lazyRouteComponent(preload);

export function markdownFileModule(documents: ReturnType<typeof createLoader<MarkdownModule>>): FileTypeModule {
  return {
    icon: File01Icon,

    async load({ proto, item }) {
      const file = { contributor: proto.contributorKey, prototype: proto.id, path: item.path };
      const mod = await documents.load(file, { inManifest: true }).catch((error: unknown) => {
        // A document that doesn't compile shows its error in place, and loads again when it's fixed.
        documents.incomplete.add(file.path);
        return error instanceof Error ? error : new Error(String(error));
      });
      if (!mod) return undefined;
      const app =
        file.contributor === SYSTEM_CONTENT_KEY
          ? '/' + rootOf(file.contributor, file.prototype)
          : addressOf(file.contributor, file.prototype);
      return {
        file,
        Component:
          mod instanceof Error
            ? () => {
                throw mod;
              }
            : mod.default,
        frontmatter: (mod instanceof Error ? undefined : mod.frontmatter) ?? {},
        docKey: `${file.contributor}/${file.prototype}/${artifactSlug(item.path)}`,
        // The folder the document is in, for its relative links.
        base: artifactFolder(item.path) ? `${app}/${artifactFolder(item.path)}` : app,
      };
    },

    Page: MarkdownPage,
  };
}
