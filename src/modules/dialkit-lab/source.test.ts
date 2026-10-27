import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectSource, transformSource, savedConfig } from './node/source.ts';
import type { DialConfig } from 'dialkit';
import type { Panel } from './lib/wire.ts';
const config={size:[32,16,64,1],folder:{_collapsed:true,gap:[16,0,40,2]},position:{type:'pad',x:[0,-100,100,1],y:[0,-100,100,1]},spring:{type:'spring',stiffness:180},image:{type:'image',options:['/a.png']},replay:{type:'action',label:'Replay'}} satisfies DialConfig;
const panel:Panel={id:'p',name:'Layout',config,values:{size:45,folder:{gap:20},position:{x:24,y:21},spring:{type:'easing',duration:.4,ease:[.2,.8,.4,1]},image:'/a.png',replay:{type:'action',label:'Replay'}}};
const source=`/** @studio-id abc123 */
// @dialkit-lab {"version":1}
import {useBespokeControls as useControls,type DialConfig} from '@module/dialkit-lab';
const config={size:[32,16,64,1]} satisfies DialConfig;
export default function View(){const values=useControls('Layout',config);return <h1 style={{fontSize:values.size}}>Kept</h1>}
`;
test('source is the attachment authority even when its view is inactive',()=>{
 assert.deepEqual(inspectSource(source),{attached:true,connected:true});
 assert.deepEqual(inspectSource('// @dialkit-lab {"version":1}\nexport default null'),{attached:true,connected:false});
 assert.deepEqual(inspectSource('export default null'),{attached:false,connected:false});
});
test('save updates defaults while preserving the control schema and actions',()=>{
 const saved=savedConfig(config,panel.values);
 assert.deepEqual(saved.size,[45,16,64,1]);assert.deepEqual(saved.folder,{_collapsed:true,gap:[20,0,40,2]});
 assert.deepEqual(saved.position.x,[24,-100,100,1]);assert.deepEqual(saved.replay,config.replay);assert.equal(saved.spring.type,'easing');
 const next=transformSource(source,[panel],false);assert.match(next,/useControls\('Layout',\{/);assert.match(next,/"size": \[\s*45/);assert.match(next,/@studio-id abc123/);assert.equal(next.match(/@studio-id/g)?.length,1);
});
test('detach preserves rendered bindings, identity, typed transition values and ordinary source',()=>{
 const next=transformSource(source,[panel],true);
 assert.doesNotMatch(next,/@module\/dialkit-lab|@dialkit-lab|useControls\(/);
 assert.match(next,/@studio-id abc123/);assert.equal(next.match(/@studio-id/g)?.length,1);assert.match(next,/"size": 45/);assert.match(next,/style=\{\{fontSize:values.size\}\}/);assert.match(next,/type:"easing"/);
 assert.equal(transformSource(next,[],true),next);
});
test('mismatched, duplicate and dynamic groups cannot silently bake the wrong values',()=>{
 assert.throws(()=>transformSource(source,[],true),/wait for Layout/);
 assert.throws(()=>transformSource(source.replace("'Layout'",'getName()'),[panel],true),/literal/);
 assert.throws(()=>transformSource(source.replace('return <h1',"useControls('Layout',config);return <h1"),[panel],true),/Duplicate/);
 assert.throws(()=>transformSource(source.replace('useControls(\'Layout\',config)','useControls'),[panel],true),/reference|match/);
});
test('uploaded images become ordinary static imports and foreign assets are rejected',()=>{
 const image={...panel,values:{...panel.values,image:'/src/prototypes/pat/lab/assets/dialkit-abcdef.png'}};
 const next=transformSource(source,[image],true,'pat/lab','nested/view.tsx');
 assert.match(next,/^\/\*\* @studio-id abc123/);
 assert.match(next,/from "\.\/\.\.\/assets\/dialkit-abcdef.png"/);assert.match(next,/"image": dialKitAsset0/);assert.doesNotMatch(next,/@module\/dialkit-lab|@dialkit-lab/);
 assert.throws(()=>transformSource(source,[image],true,'other/lab'),/different prototype/);
});

test('reload URLs keep the same static asset import across repeated saves and detach',()=>{
 const asset={...panel,values:{...panel.values,image:'/src/prototypes/pat/lab/assets/dialkit-abcdef.png'}};
 const saved=transformSource(source,[asset],false,'pat/lab');
 const reloaded={...asset,values:{...asset.values,image:'/prototypes/pat/lab/assets/dialkit-abcdef.png'}};
 const twice=transformSource(saved,[reloaded],false,'pat/lab');
 assert.equal(twice,saved);
 const detached=transformSource(twice,[reloaded],true,'pat/lab');
 assert.match(detached,/"image": dialKitAsset0/);assert.doesNotMatch(detached,/"\/prototypes\//);
});

test('detaching an action-only callback keeps prototype state and removes the unused setter binding',()=>{
 const input=source.replace("const values=useControls('Layout',config);","const [count,setCount]=useState(0); const values=useControls('Layout',config,{onAction:()=>setCount(n=>n+1)});").replace('>Kept</h1>','>{count}</h1>');
 const next=transformSource(input,[panel],true);
 assert.doesNotMatch(next,/setCount/);assert.match(next,/\[count,\s*\]=useState\(0\)/);
});
