import { useEffect, useRef, useState, type RefObject } from 'react';
import { DialRoot, DialStore, useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import { FloatingDialKit } from './floating-panel';
import { channel, acceptsPacket, type Packet, type Panel, type Scope } from './lib/wire';

function Mirror({ panel, send }: { panel: Panel; send: (p: Partial<Packet>) => void }) {
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
    const unsubscribe = DialStore.subscribe(`inspector-${panel.id}`, () => {
      if (applying) return;
      const values = DialStore.getValues(`inspector-${panel.id}`);
      for (const [path, value] of Object.entries(values)) {
        const remote = path.split('.').reduce<unknown>((obj, key) => obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined, current.current.values);
        if (JSON.stringify(value) !== JSON.stringify(remote)) send({ kind: 'update', id: panel.id, path, value });
      }
    });
    const sync = () => { applying = true; controller.setValues(current.current.values); applying = false; };
    sync();
    const listener = () => sync();
    window.addEventListener(`dialkit-lab-sync-${panel.id}`, listener);
    return () => { unsubscribe(); window.removeEventListener(`dialkit-lab-sync-${panel.id}`, listener); };
  }, [panel.id]);
  useEffect(() => { window.dispatchEvent(new Event(`dialkit-lab-sync-${panel.id}`)); }, [panel.values]);
  return null;
}

export function PrototypeInspector({ frame, scope, active, dark }: {
  frame: RefObject<HTMLIFrameElement | null>; scope: Scope; active: boolean; dark: boolean;
}) {
  const [panels, setPanels] = useState<Record<string, Panel>>({});
  const sequence = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const send = (payload: Partial<Packet>) => {
    if (!activeRef.current) return;
    frame.current?.contentWindow?.postMessage({ channel, version: 1, ...scope, sequence: ++sequence.current, ...payload }, location.origin);
  };
  useEffect(() => {
    setPanels({});
    if (!active) return;
    const received = new Map<string, number>();
    const onMessage = (event: MessageEvent) => {
      if (!activeRef.current || !acceptsPacket(event, frame.current?.contentWindow ?? null, location.origin, scope)) return;
      const p = event.data;
      const id = p.kind === 'snapshot' ? p.panel!.id : p.id;
      if (!id || p.sequence <= (received.get(id) ?? -1)) return;
      received.set(id, p.sequence);
      if (p.kind === 'snapshot') setPanels(previous => ({ ...previous, [id]: p.panel! }));
      if (p.kind === 'remove') setPanels(previous => { const next = { ...previous }; delete next[id]; return next; });
    };
    window.addEventListener('message', onMessage);
    send({ kind: 'request' });
    return () => window.removeEventListener('message', onMessage);
  }, [scope.session, scope.runtime, scope.identity, active]);
  if (!active || !Object.keys(panels).length) return null;
  const entries = Object.values(panels);
  return (
    <>
      {entries.map(panel => <Mirror key={panel.id} panel={panel} send={send} />)}
      <FloatingDialKit count={entries.length} frame={frame} reset={() => entries.forEach(panel => send({ kind: 'reset', id: panel.id }))}>
        <DialRoot mode='inline' theme={dark ? 'dark' : 'light'} versions='menu' />
      </FloatingDialKit>
    </>
  );
}
