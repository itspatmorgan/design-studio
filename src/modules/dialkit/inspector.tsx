import { useEffect, useRef, useState, type RefObject } from 'react';
import { DialRoot, DialStore, useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import { isDialKitShortcut } from './shortcut';
import { reportControls, useControlVisibility, toggleControls, controlVisibility } from './visibility';
import { FloatingDialKit } from './floating-panel';
import { EmptyControls } from './empty-controls';
import { useManifest, allPrototypes, readSource, callModule } from '#studio/data';
import { readWorkspace, type Workspace } from './scaffold';
import { reportTuning } from './tuning';
import { saveDialKit } from './setup';
import { channel, acceptsPacket, validPacket, type Packet, type Panel, type Scope } from './lib/wire';

function Mirror({ panel, send, prototypeId, onError, onPending, editable }: { panel: Panel; send: (p: Partial<Packet>) => void; prototypeId:string; onError:(message:string)=>void; onPending:(delta:number)=>void; editable:boolean }) {
  const controller = useDialKitController(panel.name, panel.config, {
    id: `inspector-${panel.id}`, persist: false,
    onAction: path => send({ kind: 'action', id: panel.id, path }),
  });
  useEffect(() => { DialStore.updatePanel(`inspector-${panel.id}`, panel.name, panel.config, undefined, { retainOnUnmount: false, persist: false }); }, [panel.id, panel.name, JSON.stringify(panel.config)]);
  const current = useRef(panel);
  current.current = panel;
  useEffect(() => {
    // Programmatic updates are suppressed from the outgoing subscription.
    let applying = false;
    let disposed = false;
    const uploads = new Map<string,{value:string;token:symbol}>();
    const onReset=()=>uploads.clear();
    window.addEventListener('dialkit-reset',onReset);
    const unsubscribe = DialStore.subscribe(`inspector-${panel.id}`, () => {
      if (applying) return;
      const values = DialStore.getValues(`inspector-${panel.id}`);
      for (const [path, value] of Object.entries(values)) {
        const remote = path.split('.').reduce<unknown>((obj, key) => obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined, current.current.values);
        // Choosing the original image also supersedes an outstanding upload.
        if (JSON.stringify(value) === JSON.stringify(remote)) {
          if (uploads.get(path)?.value !== value) uploads.delete(path);
          continue;
        }
        if (JSON.stringify(value) !== JSON.stringify(remote)) {
          const config = path.split('.').reduce<any>((obj,key)=>obj?.[key],current.current.config);
          if (editable && config?.type === 'image' && typeof value === 'string' && /^data:image\/[^;]+;base64,/.test(value)) {
            if(uploads.get(path)?.value===value) continue;
            const token=Symbol();uploads.set(path,{value,token});onPending(1);
            void callModule<{url:string}>('dialkit','image',{prototypeId,dataUrl:value}).then(result=>{
              if(!disposed&&uploads.get(path)?.token===token){uploads.delete(path);onError('');controller.setValue(path,result.url);}
            }).catch(error=>{
              if(!disposed&&uploads.get(path)?.token===token){uploads.delete(path);applying=true;controller.setValues(current.current.values);applying=false;onError(error instanceof Error?error.message:'Image upload failed.');}
            }).finally(()=>{if(uploads.get(path)?.token===token)uploads.delete(path);onPending(-1);});
          } else {if(config?.type==='image')uploads.delete(path);send({ kind: 'update', id: panel.id, path, value });}
        }
      }
    });
    const sync = () => { applying = true; const values=structuredClone(current.current.values) as Record<string,any>; for(const [path,upload] of uploads){const keys=path.split('.');let object=values;for(const key of keys.slice(0,-1))object=object[key]??={};object[keys.at(-1)!]=upload.value;} controller.setValues(values); applying = false; };
    sync();
    const listener = () => sync();
    window.addEventListener(`dialkit-sync-${panel.id}`, listener);
    return () => { disposed=true; uploads.clear(); window.removeEventListener('dialkit-reset',onReset); unsubscribe(); window.removeEventListener(`dialkit-sync-${panel.id}`, listener); };
  }, [panel.id]);
  useEffect(() => { window.dispatchEvent(new Event(`dialkit-sync-${panel.id}`)); }, [panel.values]);
  return null;
}

export function PrototypeInspector({ frame, scope, active, visible = active, dark, editable }: {
  frame: RefObject<HTMLIFrameElement | null>; scope: Scope; active: boolean; visible?: boolean; dark: boolean; editable: boolean;
}) {
  const [panels, setPanels] = useState<Record<string, Panel>>({});
  const manifest = useManifest();
  const [sourceVersion,setSourceVersion]=useState('');
  const [failure,setFailure]=useState('');
  const [saving,setSaving]=useState(false);
  const [pendingUploads,setPendingUploads]=useState(0);
  const uploadChanged=(delta:number)=>setPendingUploads(count=>Math.max(0,count+delta));
  const [prototypeId,artifactId]=JSON.parse(scope.identity) as string[];
  const proto=allPrototypes(manifest).find(p=>p.studioId===prototypeId);
  const item=proto?.artifacts?.find(i=>i.studioId===artifactId);
  useEffect(()=>{
    let cancelled=false;setSourceVersion('');
    if(editable&&active&&proto&&item)void readSource(proto,item.path).then(source=>{if(!cancelled)setSourceVersion(source.version);}).catch(error=>{if(!cancelled)setFailure(String(error));});
    return()=>{cancelled=true;};
  },[scope.identity,scope.runtime,active,manifest,editable]);
  const captureRef=useRef<null|{id:string;expected:Set<string>;panels:Record<string,Panel>;finish:(error?:Error)=>void}>(null);
  const capture=()=>new Promise<Panel[]>((resolve,reject)=>{
    const request={id:crypto.randomUUID(),expected:new Set(Object.keys(panels)),panels:{} as Record<string,Panel>,finish:(error?:Error)=>{clearTimeout(timer);captureRef.current=null;error?reject(error):resolve(Object.values(request.panels));}};
    const timer=setTimeout(()=>request.finish(Error('The preview did not respond. Reload before saving.')),3000);
    captureRef.current=request;send({kind:'request',requestId:request.id});
    if(!request.expected.size)request.finish();
  });
  useEffect(()=>editable ? reportTuning({identity:scope.identity,sourceVersion,ready:active&&!!sourceVersion&&!saving&&!pendingUploads,panels:Object.values(panels),capture}) : undefined,[scope.identity,sourceVersion,active,panels,saving,pendingUploads,editable]);
  const save=async()=>{
    if(!proto||!item)return false;
    // Capture the ready snapshot before marking the header busy.
    const operation=saveDialKit({proto:{...proto,artifacts:proto.artifacts??[]},item});
    setSaving(true);setFailure('');
    try{await operation;return true;}catch(error){setFailure(error instanceof Error?error.message:'Could not save controls.');return false;}finally{setSaving(false);}
  };

  const [openRequest, setOpenRequest] = useState(0);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!visible || !editable) return;
    const [prototypeId, artifactId] = JSON.parse(scope.identity) as string[];
    const proto = allPrototypes(manifest).find(proto => proto.studioId === prototypeId);
    const item = proto?.artifacts?.find(item => item.studioId === artifactId);
    const read = async () => {
      if (!proto || !item) return;
      try { const source = await readSource(proto, item.path); if (!cancelled) { setWorkspace(readWorkspace(source.content)); } }
      catch { if (!cancelled) { setWorkspace(null); } }
    };
    const updated = (event: Event) => { const detail = (event as CustomEvent).detail; if (detail?.identity === scope.identity) { if (detail.open) setOpenRequest(value => value + 1); void read(); } };
    window.addEventListener('studio-dialkit-workspace', updated);
    void read();
    return () => { cancelled = true; window.removeEventListener('studio-dialkit-workspace', updated); };
  }, [scope.identity, visible, manifest, editable]);
  const visibility = useControlVisibility();
  const available = visible && (Object.keys(panels).length > 0 || workspace !== null);
  useEffect(() => reportControls(scope.identity, available), [scope.identity, available]);
  useEffect(() => setPanels({}), [scope.runtime]);
  useEffect(() => {
    if (!available) return;
    const onKey = (event: KeyboardEvent) => {
      if (!isDialKitShortcut(event)) return;
      const target = event.target as Element | null;
      // Targets may belong to the preview's document, so avoid outer-realm instanceof checks.
      if (typeof target?.closest === 'function' && target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),.cm-editor')) return;
      const context = controlVisibility();
      if (!context?.available || context.identity !== scope.identity) return;
      event.preventDefault();
      event.stopPropagation();
      toggleControls(scope.identity);
    };
    const preview = frame.current?.contentWindow;
    window.addEventListener('keydown', onKey);
    preview?.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); preview?.removeEventListener('keydown', onKey); };
  }, [available, frame, scope.identity, scope.runtime]);
  const sequence = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const send = (payload: Partial<Packet>) => {
    if (!activeRef.current) return;
    const packet={channel,version:1,...scope,sequence:++sequence.current,...payload};
    if(!validPacket(packet)){setFailure('This control update exceeds the supported message size or nesting.');return;}
    frame.current?.contentWindow?.postMessage(packet,location.origin);
  };
  useEffect(() => {
    if (!active) return;
    const received = new Map<string, number>();
    const onMessage = (event: MessageEvent) => {
      if (!activeRef.current || !acceptsPacket(event, frame.current?.contentWindow ?? null, location.origin, scope)) return;
      const p = event.data;
      const id = p.kind === 'snapshot' ? p.panel!.id : p.id;
      if (!id || p.sequence <= (received.get(id) ?? -1)) return;
      received.set(id, p.sequence);
      if(p.kind==='error'){setFailure(p.message!);captureRef.current?.finish(Error(p.message));return;}
      const request=captureRef.current;
      if(p.kind==='snapshot'&&request&&request.id===p.requestId){request.panels[id]=p.panel!;request.expected.delete(id);if(!request.expected.size)request.finish();}
      if (p.kind === 'snapshot') setPanels(previous => ({ ...previous, [id]: p.panel! }));
      if (p.kind === 'remove') setPanels(previous => { const next = { ...previous }; delete next[id]; return next; });
    };
    window.addEventListener('message', onMessage);
    send({ kind: 'request' });
    return () => {window.removeEventListener('message', onMessage);captureRef.current?.finish(Error('Preview changed before saving. Try again when it is ready.'));};
  }, [scope.session, scope.runtime, scope.identity, active]);
  if (!available) return null;
  const entries = Object.values(panels);
  return (
    <>
      {entries.map(panel => <Mirror editable={editable} key={panel.id} panel={panel} send={send} prototypeId={prototypeId} onError={setFailure} onPending={uploadChanged} />)}
      {!(visibility?.identity === scope.identity && visibility.hidden) && <FloatingDialKit save={editable ? save : undefined} canSave={active&&!!sourceVersion&&!saving&&!pendingUploads} saving={saving} openRequest={openRequest} initialOpen={!!workspace && !entries.length} count={entries.length} frame={frame} reset={() => {window.dispatchEvent(new Event('dialkit-reset'));entries.forEach(panel => send({ kind: 'reset', id: panel.id }));}}>
        {failure && <p role='alert' style={{padding:'12px 16px',fontSize:13}}>{failure}</p>}
        {entries.length ? <DialRoot mode='inline' theme={dark ? 'dark' : 'light'} versions='menu' productionEnabled /> : <EmptyControls />}
      </FloatingDialKit>}
    </>
  );
}
