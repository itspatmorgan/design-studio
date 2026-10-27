import { useEffect, useRef, useState, type RefObject, type CSSProperties } from 'react';
import { DialRoot, DialStore, useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import styles from './inspector.module.css';
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
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(320);
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const send = (payload: Partial<Packet>) => {
    if (!activeRef.current) return;
    frame.current?.contentWindow?.postMessage({ channel, version: 1, ...scope, sequence: ++sequence.current, ...payload }, location.origin);
  };
  useEffect(() => {
    setPanels({});
    setNotice('');
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
  const proposal = JSON.stringify({ artifact: scope.identity, scope: 'prototype-local', panels: entries.map(({ name, config, values }) => ({ name, config, values })) }, null, 2);
  return (
    <aside aria-label='Design inspector' className={styles.panel} data-open={open} style={{ '--inspector-width': `${width}px` } as CSSProperties}>
      {entries.map(panel => <Mirror key={panel.id} panel={panel} send={send} />)}
      <button type='button' aria-label={open ? 'Collapse design inspector' : 'Open design inspector'} onClick={() => setOpen(value => !value)} style={{ cursor: 'pointer' }}>{open ? 'Tune design  →' : '←'}</button>
      <div hidden={!open}>
        <p style={{ fontSize: 12, opacity: .7, marginBlock: 12 }}>Prototype experiment · Changes stay in this preview.</p>
        <label style={{ fontSize: 12 }}>Inspector width <input aria-label='Inspector width' type='range' min='260' max='420' value={width} onChange={event => setWidth(Number(event.target.value))} /></label>
        <DialRoot mode='inline' theme={dark ? 'dark' : 'light'} versions='menu' />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, marginBlock: 20 }}>
          <button type='button' onClick={() => entries.forEach(panel => send({ kind: 'reset', id: panel.id }))}>Reset tuning</button>
          <button type='button' onClick={async () => { try { await navigator.clipboard.writeText(proposal); setNotice('Proposal copied'); } catch { setNotice('Copy from the proposal below'); } }}>Copy proposal</button>
        </div>
        <p role='status' style={{ fontSize: 12 }}>{notice}</p>
        <details><summary style={{ fontSize: 12 }}>View proposal</summary><pre style={{ fontSize: 10, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{proposal}</pre></details>
      </div>
    </aside>
  );
}
