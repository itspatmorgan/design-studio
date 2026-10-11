import { Suspense } from 'react';
// The Manual in the app: its rail button and its routes (/documentation/manual and /documentation/manual/<page>). The pages are in
// src/modules/documentation/pages/ with availability and order recorded in the manifest.
import { createRoute, notFound, lazyRouteComponent } from '@tanstack/react-router';
import { BookOpen01Icon } from '@hugeicons/core-free-icons';
import { APP_NAME } from '@/platform/app/data/config';
import type { ModuleApp } from '@/platform/core/api';
import { loadManifest } from '@/platform/app/data/manifest';
import { loadManualPage } from './loadManual';

// Manual pages render in DocLayout, loaded with the first Manual page.
const ManualPage = lazyRouteComponent(() => import('./ManualPage'));
const ManualLayout = lazyRouteComponent(() => import('./ManualLayout'));

// Loads a Manual page before it renders, like views. /documentation/manual opens index.md. Each chapter has its own Manual source.
async function manualLoader(slug: string, mode?: 'source') {
  await Promise.all([
    ManualLayout.preload?.(),
    ManualPage.preload?.(),
    mode === 'source' && import.meta.env.DEV
      ? import('./ManualPage').then(mod => mod.prepareManualSource())
      : undefined,
  ]);
  const page = (await loadManifest()).manual.find(p => p.slug === slug);
  if (import.meta.env.DEV && mode === 'source') {
    const path = 'src' + (page?.source ?? `/modules/documentation/pages/${slug}.md`);
    return {
      slug,
      filePath: path.slice(3),
      source: { path },
      title: page?.title ?? slug,
      pageTitle: [page?.title ?? slug, 'Source', APP_NAME].join(' — '),
    };
  }
  if (!page) throw notFound();
  const mod = await loadManualPage(slug, page?.source);
  if (!mod) throw notFound();
  const { title, description, toc } = mod.frontmatter ?? {};
  return {
    slug,
    filePath: page.source ?? `/modules/documentation/pages/${slug}.md`,
    Component: mod.default,
    title,
    description,
    toc,
    pageTitle: [title, 'Manual', APP_NAME].filter(Boolean).join(' — '),
  };
}

export default {
  icon: BookOpen01Icon,
  rail: 'top',
  order: 30,
  routes: root => {
    // The Manual's sidebar, around whichever page is open.
    const manualRoute = createRoute({
      getParentRoute: () => root,
      path: 'documentation/manual',
      validateSearch: (search: Record<string, unknown>): { mode?: 'source' } => ({
        mode: search.mode === 'source' ? 'source' : undefined,
      }),
      component: () => (
        <Suspense fallback={null}>
          <ManualLayout />
        </Suspense>
      ),
    });
    const indexRoute = createRoute({
      getParentRoute: () => manualRoute,
      path: '/',
      loaderDeps: ({ search }) => ({ mode: search.mode }),
      loader: ({ deps }) => manualLoader('index', deps.mode),
      head: ({ loaderData }) => ({ meta: [{ title: loaderData?.pageTitle ?? APP_NAME }] }),
      component: () => (
        <Suspense fallback={null}>
          <ManualPage {...indexRoute.useLoaderData()} />
        </Suspense>
      ),
    });
    const pageRoute = createRoute({
      getParentRoute: () => manualRoute,
      path: '$page',
      loaderDeps: ({ search }) => ({ mode: search.mode }),
      loader: ({ params, deps }) => manualLoader(params.page, deps.mode),
      head: ({ loaderData }) => ({ meta: [{ title: loaderData?.pageTitle ?? APP_NAME }] }),
      component: () => (
        <Suspense fallback={null}>
          <ManualPage {...pageRoute.useLoaderData()} />
        </Suspense>
      ),
    });
    return [manualRoute.addChildren([indexRoute, pageRoute])];
  },
} satisfies ModuleApp;
