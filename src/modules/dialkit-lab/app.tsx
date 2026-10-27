import { SlidersHorizontalIcon } from '@hugeicons/core-free-icons';
import { lazy, Suspense } from 'react';
import { toggleControls, useControlVisibility, controlVisibility } from './visibility';
import type { ModuleApp, PreviewInspectorProps } from '#studio/ui';
const Inspector = import.meta.env.DEV && import.meta.env.VITE_DIALKIT_EXPERIMENT === 'true'
  ? lazy(() => import('./inspector').then(module => ({ default: module.PrototypeInspector }))) : null;
function PreviewInspector(props: PreviewInspectorProps) {
  return Inspector ? <Suspense fallback={null}><Inspector {...props} /></Suspense> : null;
}
export default { icon: SlidersHorizontalIcon, rail: 'none', order: 50, localOnly: true, artifactActions: context => {
  if (!import.meta.env.DEV || import.meta.env.VITE_DIALKIT_EXPERIMENT !== 'true' || context.environment.scope !== 'prototype' || context.item.fileType !== 'view') return [];
  const state = controlVisibility();
  const present = state?.identity === JSON.stringify([context.proto.studioId, context.item.studioId]) && state.available;
  return [{ id: 'dialkit-lab.toggle', label: present ? 'Remove DialKit' : 'Add DialKit', icon: SlidersHorizontalIcon, localOnly: true, mutates: true,
    run: context => import('./setup').then(module => present ? module.deleteDialKit(context) : module.addDialKit(context)),
  }];
}, useActions: proto => {
  const context = useControlVisibility();
  return import.meta.env.VITE_DIALKIT_EXPERIMENT === 'true' && context?.available && context.prototypeId === proto.studioId
    ? [{ label: context.hidden ? 'Show DialKit' : 'Hide DialKit', icon: SlidersHorizontalIcon, group: 'visibility' as const, onSelect: () => toggleControls(context.identity) }] : [];
}, previewInspector: PreviewInspector } satisfies ModuleApp;
