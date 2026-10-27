import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DialStore, type DialConfig } from 'dialkit';
const config = {
  slider: [5, 0, 10, 1], inferred: 20, enabled: true, title: 'Hello',
  text: {type:'text',default:'Explicit'}, color:'#1234', explicitColor:{type:'color',default:'oklch(0.7 0.1 40)'},
  select:{type:'select',options:['a','b']}, labels:{type:'select',options:[{value:'a',label:'A'}]},
  image:{type:'image',options:['/image.svg']}, upload:{type:'image'},
  pad:{type:'pad',x:[0,-10,10,1],y:[0,-10,10,1]}, spring:{type:'spring',stiffness:180,damping:20},
  easing:{type:'easing',duration:0.4,ease:[0.2,0.8,0.4,1]}, folder:{_collapsed:true,depth:{gap:[4,0,12,1]},action:{type:'action'}},
} satisfies DialConfig;
test('installed native renderer inventory covers every authored control and nested metadata',()=>{
  const id='native-inventory';DialStore.registerPanel(id,'Inventory',config,undefined,{persist:false,retainOnUnmount:false});
  try {
    const panel=DialStore.getPanel(id)!;
    const types=new Set<string>();const walk=(controls:typeof panel.controls)=>{for(const control of controls){types.add(control.type);if(control.children)walk(control.children);}};walk(panel.controls);
    assert.deepEqual([...types].sort(),['action','color','folder','image','pad','select','slider','text','toggle','transition'].sort());
    assert.equal(panel.controls.find(c=>c.path==='folder')?.defaultOpen,false);
    const values=DialStore.getValues(id);assert.equal(values['folder.depth.gap'],4);assert.equal(values['folder._collapsed'],undefined);assert.equal(values.upload,'');assert.equal(values.select,'a');assert.deepEqual(values.pad,{x:0,y:0});
  } finally {DialStore.unregisterPanel(id);}
});
test('native subscriptions, nested updates, config reconciliation and cleanup remain usable',()=>{
 const id='native-lifecycle';let changes=0;let action='';DialStore.registerPanel(id,'Lifecycle',config,undefined,{persist:false,retainOnUnmount:false});
 const unsubscribe=DialStore.subscribe(id,()=>changes++);const off=DialStore.subscribeActions(id,path=>action=path);
 try {
  DialStore.updateValue(id,'folder.depth.gap',8);DialStore.updateValues(id,{title:'Changed',pad:{x:3,y:-4}});DialStore.triggerAction(id,'folder.action');
  assert.equal(action,'folder.action');assert.equal(DialStore.getValues(id)['folder.depth.gap'],8);assert.deepEqual(DialStore.getValues(id).pad,{x:3,y:-4});assert.ok(changes>=2);
  DialStore.updatePanel(id,'Updated',{...config,added:[2,0,4]},undefined,{persist:false,retainOnUnmount:false});assert.equal(DialStore.getValues(id).title,'Changed');assert.equal(DialStore.getValues(id).added,2);
  DialStore.resetValues(id);assert.equal(DialStore.getValues(id).title,'Hello');assert.equal(DialStore.getValues(id)['folder.depth.gap'],4);
 }finally{unsubscribe();off();DialStore.unregisterPanel(id);}assert.equal(DialStore.getPanel(id),undefined);
});
test('native versions are editable branches and can be renamed, recalled and deleted',()=>{
 const id='native-versions';DialStore.registerPanel(id,'Versions',config,undefined,{persist:false,retainOnUnmount:false});
 try{
  DialStore.updateValue(id,'slider',6);const saved=DialStore.savePreset(id,'Saved');DialStore.updateValue(id,'slider',7);
  assert.equal(DialStore.getPresets(id)[0].values.slider,7);
  DialStore.clearActivePreset(id);DialStore.updateValue(id,'slider',2);DialStore.loadPreset(id,saved);assert.equal(DialStore.getValues(id).slider,7);
  DialStore.renamePreset(id,saved,'Renamed');assert.equal(DialStore.getPresets(id)[0].name,'Renamed');DialStore.deletePreset(id,saved);assert.equal(DialStore.getPresets(id).length,0);
 }finally{DialStore.unregisterPanel(id);}
});
