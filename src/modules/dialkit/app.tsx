import { SlidersHorizontalIcon } from '@hugeicons/core-free-icons';
import { lazy, Suspense } from 'react';
import { contribution, useManifest } from '#studio/data';
import type { ModuleApp, PreviewInspectorProps } from '#studio/ui';
import { dialKitShortcutLabel } from './shortcut';
import { toggleControls, useControlVisibility } from './visibility';
import type { Attachments } from './build';
const Inspector=lazy(()=>import('./inspector').then(module=>({default:module.PrototypeInspector})));
function PreviewInspector(props:PreviewInspectorProps){
  const manifest=useManifest();
  const [,artifactId]=JSON.parse(props.scope.identity) as string[];
  const attachment=contribution<Attachments>(manifest,'dialkit')?.[artifactId];
  if(!import.meta.env.DEV&&!attachment?.published)return null;
  return <Suspense fallback={null}><Inspector {...props} editable={import.meta.env.DEV}/></Suspense>;
}
export default {
  icon:SlidersHorizontalIcon,rail:'none',order:50,localOnly:false,
  artifactActions:context=>{
    if(!context.environment.local||context.environment.scope!=='prototype'||context.item.fileType!=='view')return [];
    const attached=!!context.manifest && !!contribution<Attachments>(context.manifest,'dialkit')?.[context.item.studioId!]?.attached;
    return [{id:'dialkit.toggle',label:attached?'Remove DialKit':'Add DialKit',icon:SlidersHorizontalIcon,localOnly:true,mutates:true,
      run:context=>import('./setup').then(module=>attached?module.deleteDialKit(context):module.addDialKit(context))}];
  },
  useActions:proto=>{
    const context=useControlVisibility();
    return context?.available&&context.prototypeId===proto.studioId?[{label:context.hidden?'Show DialKit':'Hide DialKit',icon:SlidersHorizontalIcon,group:'visibility' as const,shortcut:dialKitShortcutLabel(),onSelect:()=>toggleControls(context.identity)}]:[];
  },
  previewInspector:PreviewInspector,
} satisfies ModuleApp;
