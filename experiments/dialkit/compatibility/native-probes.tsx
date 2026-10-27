// Deliberately explicit test harness; not an inferred production integration API.
import { useState } from 'react';
import { DialStore, useDialKitController, useDialTimeline, type DialConfig, type TimelineConfig } from 'dialkit';
import { motion } from 'motion/react';
const config = { amount: [12, 0, 100, 1], nested: { text: { type: 'text', default: 'original' } }, replay: { type: 'action' } } satisfies DialConfig;
const timelineConfig = {
  duration: 2,
  entrance: { at: 0, duration: 1, from: { x: 0, opacity: 0.2 }, to: { x: 100, opacity: 1 }, transition: { type: 'easing', duration: 1, ease: [0, 0, 1, 1] } },
  sequence: { at: 0, from: { x: 0 }, steps: [{ duration: 0.5, to: { x: 50 } }, { duration: 0.5, to: { x: 100 } }] },
  tracks: { at: 0, props: { x: { from: 0, to: 100, duration: 1 }, opacity: { from: 0, to: 1, delay: 0.5, duration: 0.5 } } },
  group: { marker: { at: 1.5, duration: 0.5 } },
} satisfies TimelineConfig;
export function DialKitCompatibilityProbe({ scope }: { scope: string }) {
  const [actions, setActions] = useState(0);
  const [result, setResult] = useState('Not run');
  const [loop, setLoop] = useState(false);
  const id = `compatibility-controller-${scope}`;
  const controller = useDialKitController('Controller probe', config, {
    id, persist: { key: id, storage: 'sessionStorage', presets: true },
    onAction: () => setActions(n => n + 1),
    shortcuts: { amount: { key: 'a', modifier: 'alt', mode: 'fine', interaction: 'drag' } },
  });
  const local = useDialKitController('Local storage probe', { amount: [2, 0, 100, 1] }, {id: `${id}-local`, persist: {key: `${id}-local`, storage: 'localStorage', presets: false}});
  const timeline = useDialTimeline('Compatibility timeline', timelineConfig, { id: `compatibility-timeline-${scope}`, persist: false, autoplay: false, loop: loop ? { from: 0.5 } : false });
  const entrance = timeline.entrance;
  const run = () => {
    try {
      controller.setValue('amount', 30);
      controller.setValues({ nested: { text: 'updated' } });
      if (controller.getValues().amount !== 30 || controller.getValues().nested.text !== 'updated') throw Error('Controller update failed');
      controller.setOpen(true); if (!controller.getOpen()) throw Error('Panel open failed');
      for (const previous of DialStore.getPresets(id)) DialStore.deletePreset(id, previous.id);
      const saved = DialStore.savePreset(id, 'Compatibility version'); 
      DialStore.clearActivePreset(id);
      controller.setValue('amount', 80); DialStore.loadPreset(id, saved);
      if (controller.getValues().amount !== 30) throw Error('Version recall failed');
      DialStore.renamePreset(id, saved, 'Renamed version');
      if (DialStore.getPresets(id).find(p => p.id === saved)?.name !== 'Renamed version') throw Error('Version rename failed');
      DialStore.triggerAction(id, 'replay');
      if (DialStore.resolveShortcutTarget('a', 'alt')?.panelId !== id) throw Error('Shortcut lookup failed');
      setResult('PASS: controller setValue, nested setValues, getValues, open, preset save/load/rename, action, shortcut registration');
    } catch (error) { setResult(String(error)); }
  };
  return <section aria-label='Native core probes' style={{margin:'32px 0',padding:24,border:'1px solid #b7bcb3',borderRadius:12,maxWidth:650}}>
    <h2>Native core features</h2>
    <p>These explicit probe buttons exercise native APIs inside the iframe, independently of the floating inspector.</p>
    <button onClick={run}>Run controller checks</button>{' '}
    <button onClick={() => {controller.resetValues(); local.resetValues(); for (const saved of DialStore.getPresets(id)) DialStore.deletePreset(id,saved.id); setResult(`Reset amount: ${controller.getValues().amount}; saved versions: ${DialStore.getPresets(id).length}`);}}>Reset controller and delete version</button>{' '}

    <p role='status' data-testid='probe-result'>{result}</p>
    <pre data-testid='controller-values'>{JSON.stringify({values:controller.values,actions,presets:DialStore.getPresets(id).map(p=>p.name)})}</pre>
    <button onClick={()=>local.setValue('amount',9)}>Set local persistence probe</button>
    <output data-testid='local-values'>{local.values.amount}</output>
    <p>Session persistence is deliberately enabled only for this named native probe. Reload to inspect retention.</p>
    <div style={{height:60,background:'#e9ebdf',overflow:'hidden'}}><span data-testid='timeline-target' style={{display:'block',width:40,height:40,background:'#b45437',transform:`translateX(${Number(entrance.current?.x ?? 0)}px)`,opacity:Number(entrance.current?.opacity ?? 1)}} /></div>
    <button onClick={()=>setLoop(value=>!value)}>Loop timeline: {loop ? 'on' : 'off'}</button>{' '}
    <button onClick={()=>timeline.play()}>Play timeline</button>{' '}
    <button onClick={()=>timeline.pause()}>Pause timeline</button>{' '}
    <button onClick={()=>timeline.replay()}>Replay timeline</button>{' '}
    <button onClick={()=>timeline.seek(0.5)}>Seek timeline midpoint</button>{' '}
    <button onClick={()=>timeline.seek(0)}>Seek timeline start</button>
    <pre data-testid='timeline-values'>{JSON.stringify({time:timeline.time,playing:timeline.playing,duration:timeline.duration,entrance:entrance.current,sequence:timeline.sequence.current,tracks:timeline.tracks.current})}</pre>

  </section>;
}
export function CompatibilityMotion({ transition, replay }: { transition: import('dialkit').TransitionConfig; replay: number }) {
  const animation = transition.type === 'easing' ? { type: 'tween' as const, duration: transition.duration, ease: transition.ease } : transition;
  return <motion.span key={replay} data-testid='spring-target' initial={{ x: -50 }} animate={{ x: 50 }} transition={animation} style={{display:'block',width:24,height:24,background:'currentColor',borderRadius:24}} />;
}
