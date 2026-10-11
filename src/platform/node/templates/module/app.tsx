// __LABEL__ in the app: a button on the rail, and the page it opens at /__ID__. The shell finds this file by its
// name, so nothing else needs to know about it. An app.tsx can also add routes, entries in the ⌘K palette, and entries in
// every prototype's "…" menu: see src/platform/context/modules.md.
import { createRoute } from '@tanstack/react-router';
import { Home01Icon } from '@hugeicons/core-free-icons';
import { APP_NAME } from '@/platform/core/api';
import type { ModuleApp } from '@/platform/core/api';

function Page() {
  return (
    <div className="space-y-2 p-8">
      <h1 className="text-lg font-semibold text-foreground">__LABEL__</h1>
      <p className="text-sm text-muted-foreground">This page is in src/modules/__ID__/app.tsx. Change it, or replace it.</p>
    </div>
  );
}

export default {
  icon: Home01Icon,
  rail: 'top',
  order: 50,
  routes: (root) => [
    createRoute({
      getParentRoute: () => root,
      path: '__ID__',
      head: () => ({ meta: [{ title: `__LABEL__ — ${APP_NAME}` }] }),
      component: Page,
    }),
  ],
} satisfies ModuleApp;
