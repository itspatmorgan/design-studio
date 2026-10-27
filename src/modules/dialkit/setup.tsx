import { readSource, writeSource, callModule, type ArtifactContext } from '#studio/data';
import { readWorkspace, scaffoldWorkspace } from './scaffold';
import { showControls } from './visibility';
import { currentTuning } from './tuning';
const identityOf = ({proto,item}:ArtifactContext)=>JSON.stringify([proto.studioId,item.studioId]);
const notify=(context:ArtifactContext,open=false)=>window.dispatchEvent(new CustomEvent('studio-dialkit-workspace',{detail:{identity:identityOf(context),open}}));
const pending=new Set<string>();
export async function addDialKit(context:ArtifactContext) {
  const source=await readSource(context.proto,context.item.path);
  if(!readWorkspace(source.content))await writeSource(context.proto,context.item.path,scaffoldWorkspace(source.content),source.version);
  showControls(identityOf(context));notify(context,true);
}
export async function saveDialKit(context:ArtifactContext,remove=false) {
  const identity=identityOf(context);
  if(pending.has(identity))return;
  pending.add(identity);
  try {
    const tuning=currentTuning(identity);
    const source=await readSource(context.proto,context.item.path);
    const connected=/from\s*['"]@module\/dialkit['"]/.test(source.content);
    if(connected && (!tuning?.ready || !tuning.panels.length))throw Error('Open this view and wait for its live controls and image uploads before saving or removing DialKit.');
    if(connected && source.version!==tuning!.sourceVersion)throw Error('This source changed. Reload the preview before saving DialKit.');
    const panels=connected && tuning?.capture ? await tuning.capture() : tuning?.panels??[];
    const result=await callModule<{content:string}>('dialkit','transform',{source:source.content,panels,remove,assetBase:`${context.proto.contributorKey}/${context.proto.id}`,sourcePath:context.item.path});
    if(result.content!==source.content)await writeSource(context.proto,context.item.path,result.content,source.version);
    notify(context);
  } finally {pending.delete(identity);}
}
export const deleteDialKit=(context:ArtifactContext)=>saveDialKit(context,true);
