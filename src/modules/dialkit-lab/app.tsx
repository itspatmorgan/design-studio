import { Settings01Icon } from '@hugeicons/core-free-icons';
import { lazy, Suspense } from 'react';
import type { ModuleApp, PreviewInspectorProps } from '#studio/ui';
const Inspector = import.meta.env.DEV && import.meta.env.VITE_DIALKIT_EXPERIMENT === 'true'
  ? lazy(() => import('./inspector').then(module => ({ default: module.PrototypeInspector }))) : null;
function PreviewInspector(props: PreviewInspectorProps) {
  return Inspector ? <Suspense fallback={null}><Inspector {...props} /></Suspense> : null;
}
export default { icon: Settings01Icon, rail: 'none', order: 50, localOnly: true, previewInspector: PreviewInspector } satisfies ModuleApp;
