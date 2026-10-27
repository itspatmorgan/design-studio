import { useState } from 'react';
import { useBespokeControls, type DialConfig } from '@module/dialkit-lab';
import styles from './_compatibility.module.css';
// SYSTEM_IMPORT
const firstImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="90"%3E%3Crect width="160" height="90" fill="%23cbd5be"/%3E%3C/svg%3E';
const secondImage = firstImage.replace('cbd5be', 'e9bca9');
const basicConfig = {
  size: [32, 16, 64, 1], inferredNumber: 10, enabled: true,
  title: 'A little room to explore',
  caption: { type: 'text', default: 'Tune this prototype', placeholder: 'Caption' },
  alignment: { type: 'select', options: ['left', 'center', 'right'], default: 'left' },
  treatment: { type: 'select', options: [{value:'solid',label:'Solid'}, {value:'outline',label:'Outline'}], default:'solid' },
  spacing: { _collapsed: true, gap: [16, 0, 40, 2], nested: { inset: [24, 0, 48, 2] } },
} satisfies DialConfig;
const colorConfig = { accent:'#b45437', explicit:{type:'color',default:'oklch(0.65 0.15 40)'}, alpha:'#26312b80' } satisfies DialConfig;
const imageConfig = { artwork:{type:'image',options:[{value:firstImage,label:'Sage'},{value:secondImage,label:'Clay'}]}, upload:{type:'image'} } satisfies DialConfig;
const motionConfig = {
  position:{type:'pad',x:[0,-100,100,1],y:[0,-100,100,1],labels:{x:'Horizontal',y:'Vertical'}},
  spring:{type:'spring',stiffness:180,damping:20,mass:1},
  easing:{type:'easing',duration:0.4,ease:[0.16,1,0.3,1]},
  actions:{replay:{type:'action',label:'Replay motion'}},
} satisfies DialConfig;
export default function Compatibility() {
  const [replays,setReplays]=useState(0);
  const basics=useBespokeControls('Basics & folders',basicConfig);
  const colors=useBespokeControls('Color formats',colorConfig);
  const images=useBespokeControls('Images',imageConfig);
  const movement=useBespokeControls('Motion & pad',motionConfig,{onAction:path=>{if(path==='actions.replay')setReplays(n=>n+1);}});
  const values={basics,colors,images,movement,replays};
  return <main className={styles.page}>
    <p className={styles.eyebrow}>DIALKIT · COMPATIBILITY LAB · CONTEXT_LABEL</p>
    <h1>Every dial. One real preview.</h1>
    <p>Open the sliders chip. Each group drives the card below; the live values expose the exact result received by this iframe.</p>
    <section className={styles.card} style={{padding:basics.spacing.nested.inset,gap:basics.spacing.gap,textAlign:basics.alignment as 'left'|'center'|'right',borderColor:colors.accent}}>
      {(images.upload || images.artwork) ? <img alt='Controlled artwork' src={images.upload || images.artwork}/> : <p>No image selected</p>}
      <h2 style={{fontSize:basics.size,color:colors.accent}}>{basics.title}</h2>
      <p>{basics.caption}</p>
      <div className={styles.stage}><span key={replays} className={styles.dot} style={{background:colors.explicit,opacity:basics.enabled?1:0.25,transform:`translate(${movement.position.x}px,${-movement.position.y}px)`,transitionDuration:`${movement.easing.type==='easing'?movement.easing.duration:0.4}s`,transitionTimingFunction:movement.easing.type==='easing'?`cubic-bezier(${movement.easing.ease.join(',')})`:'ease'}} /></div>
      {/* SYSTEM_BUTTON */}
      <button className={styles.button} style={{background:basics.treatment==='solid'?colors.accent:'transparent',color:basics.treatment==='solid'?'white':colors.accent}} disabled={!basics.enabled} onClick={()=>setReplays(n=>n+1)}>Try the prototype</button>
      <p role='status'>Replays: {replays} · Inferred number: {basics.inferredNumber}</p>
      <div style={{background:colors.alpha,height:12}} />
    </section>
    <details open><summary>Live values received by the prototype</summary><pre data-testid='live-values'>{JSON.stringify({...values, images:{...images, upload:images.upload ? `Image data (${images.upload.length} characters)` : ''}},null,2)}</pre></details>
    <footer>End of the scroll test · CONTEXT_LABEL</footer>
  </main>;
}
