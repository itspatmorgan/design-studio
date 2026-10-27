import { useEffect, useRef, useState } from 'react';
import { DialStore, useDialKitController, type DialConfig, type UseDialOptions, type DialValue } from 'dialkit';
import { channel, acceptsPacket, validPacket, type Packet, type Scope } from './wire';
export type { DialConfig } from 'dialkit';

// The hook stays beside the prototype's bespoke bindings. No shell imports or file writes.
export function useBespokeControls<T extends DialConfig>(name: string, config: T, options?: Pick<UseDialOptions, 'onAction'>) {
  const [id] = useState(() => crypto.randomUUID());
  const storeId = `preview-${id}`;
  const controls = useDialKitController(name, config, { id: storeId, persist: false, onAction: options?.onAction });
  const latest = useRef({ controls, config, name, options });
  latest.current = { controls, config, name, options };
  useEffect(() => () => {
    // Fast Refresh re-registers synchronously. Real departure releases retained values.
    queueMicrotask(() => {
      if (!DialStore.getPanel(storeId)) {
        DialStore.registerPanel(storeId, name, latest.current.config, undefined, { retainOnUnmount: false, persist: false });
        DialStore.unregisterPanel(storeId);
      }
    });
  }, [storeId]);
  const publish = useRef<(requestId?:string)=>void>(() => {});
  const sequence = useRef(0);
  useEffect(() => {
    // The host gates published inspectors per view; the same scoped bridge serves both environments.
    if (parent === window || document.getElementById('root')?.inert) return;
    const session = new URLSearchParams(location.search).get('session');
    const runtime = document.documentElement.dataset.previewRuntime;
    const identity = document.querySelector('[data-preview-displayed-identity]')?.getAttribute('data-preview-displayed-identity');
    if (!session || !runtime || !identity) return;
    const scope: Scope = { session, runtime, identity };
    let received = -1;
    const send = (message: Partial<Packet>) => {
      const packet={ channel, version: 1, ...scope, sequence: ++sequence.current, ...message };
      if(validPacket(packet))parent.postMessage(packet,location.origin);
      else parent.postMessage({channel,version:1,...scope,sequence:++sequence.current,kind:'error',id,message:'These controls exceed the supported message size or nesting. Simplify the group before saving.',...(message.requestId?{requestId:message.requestId}:{})},location.origin);
    };
    publish.current = (requestId) => {
      if (document.querySelector('[data-preview-pending-identity]')) return;
      const { controls, config, name } = latest.current;
      send({ kind: 'snapshot', ...(requestId ? {requestId} : {}), panel: { id, name, config, values: controls.getValues() } });
    };
    const onMessage = (event: MessageEvent) => {
      if (!acceptsPacket(event, parent, location.origin, scope)) return;
      const packet = event.data;
      if (packet.sequence <= received) return;
      received = packet.sequence;
      if (packet.kind === 'request') { publish.current(packet.requestId); return; }
      if (packet.id !== id || document.querySelector('[data-preview-pending-identity]')) return;
      if (packet.kind === 'update') latest.current.controls.setValue(packet.path!, packet.value as DialValue);
      if (packet.kind === 'reset') latest.current.controls.resetValues();
      if (packet.kind === 'action') latest.current.options?.onAction?.(packet.path!);
    };
    window.addEventListener('message', onMessage);
    publish.current();
    return () => {
      send({ kind: 'remove', id });
      window.removeEventListener('message', onMessage);
      publish.current = () => {};

    };
  }, [id]);
  useEffect(() => publish.current(), [controls.values, config, name]);
  return controls.values;
}
