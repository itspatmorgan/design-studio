import fs from 'node:fs';
import path from 'node:path';
import type { ModuleBuild } from '../../core/modules/index.ts';
import { moduleFolder } from '../../core/roots.ts';
import { frontmatter } from '../../node/lib/frontmatter.js';
import { manualChapterEnabled } from './manual-pages.js';
import type { DocumentationContribution, ManualPage } from './types.ts';

// Runs only while Documentation is enabled. Human chapters have one home: module associations control availability,
// not source ownership.
const folder = () => `${moduleFolder('documentation')}/pages`;

export default {
  watch: ['src/platform/modules/documentation/pages'],
  manifest({ root, out, enabled }) {
    const manual: (ManualPage & { order: number })[] = [];
    let errors = 0;
    const dir = path.join(root, 'src', folder());
    const files = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter(f => f.endsWith('.md'))
          .sort()
      : [];
    const pages = files.map(file => ({
      file: path.join(dir, file),
      where: `src/${folder()}/${file}`,
      slug: file.replace(/\.md$/, ''),
    }));
    const taken = new Map<string, string>();
    for (const page of pages) {
      // biome-ignore lint/suspicious/noExplicitAny: frontmatter values are validated below, as before
      const fm = frontmatter(fs.readFileSync(page.file, 'utf8')) as Record<string, any> | null;
      if (fm?.module !== undefined && (typeof fm.module !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(fm.module))) {
        out.error(`[manifest] Skipped ${page.where}: module must be a capability ID`);
        errors++;
        continue;
      }
      if (!manualChapterEnabled(fm, enabled)) continue;
      const { where } = page;
      if (!fm || typeof fm.title !== 'string' || !fm.title) {
        out.error(`[manifest] Skipped ${where}: needs frontmatter with a "title"`);
        errors++;
        continue;
      }
      if (typeof fm.order !== 'number') {
        out.error(`[manifest] Skipped ${where}: needs a numeric "order" in its frontmatter`);
        errors++;
        continue;
      }
      const slug = page.slug;
      if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
        out.error(`[manifest] Skipped ${where}: its address "${slug}" must be lowercase letters, numbers, and hyphens`);
        errors++;
        continue;
      }
      if (taken.has(slug)) {
        out.error(
          `[manifest] Skipped ${where}: ${taken.get(slug)} already has the Manual address /documentation/manual/${slug}`,
        );
        errors++;
        continue;
      }
      taken.set(slug, where);
      manual.push({
        slug,
        title: fm.title,
        description: fm.description ?? '',
        section: fm.section || null,
        order: fm.order,
        source: `/${folder()}/${slug}.md`,
      });
    }
    manual.sort((a, b) => a.order - b.order);
    return { data: { manual: manual.map(({ order, ...page }) => page) }, errors };
  },
  // The chapters in the manifest, plus every Markdown file in the folder: a chapter with temporarily invalid
  // metadata stays repairable.
  sourceFiles(data, { root }) {
    if (!data) return []; // no contribution: Documentation is off for this manifest
    const dir = path.join(root, 'src', folder());
    const listed = data.manual.map(page => `src${page.source ?? `/${folder()}/${page.slug}.md`}`);
    const present = fs.existsSync(dir)
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
          .map(entry => `src/${folder()}/${entry.name}`)
      : [];
    return [...listed, ...present];
  },
} satisfies ModuleBuild<DocumentationContribution>;
