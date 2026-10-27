import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { transformSource } from './node/source.ts';

test('DialKit enabled, blocked disable/remove, detached, disabled, re-enabled and physically removed preserve both designs', {timeout:600000}, t=>{
 const root=process.cwd();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dialkit-lifecycle-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(root,dir,{recursive:true,filter:file=>!['.git','node_modules','dist'].includes(path.basename(file))&&!file.startsWith(path.join(root,'src/prototypes')+path.sep)});
 fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'));
 for(const entry of fs.readdirSync(path.join(root,'src/systems'))) {const modules=path.join(root,'src/systems',entry,'node_modules');if(fs.existsSync(modules))fs.symlinkSync(modules,path.join(dir,'src/systems',entry,'node_modules'));}
 fs.mkdirSync(path.join(dir,'contributors'),{recursive:true});fs.writeFileSync(path.join(dir,'contributors/lifecycle.json'),JSON.stringify({formatVersion:1,studioId:'b2np1wkh38geckad',name:'Lifecycle Fixture',github:'',email:'dialkit-lifecycle@example.test',preferences:{onboarding:{welcomeDismissed:true}}}));
 const env={...process.env,MISE_TRUSTED_CONFIG_PATHS:dir,GIT_CONFIG_COUNT:'2',GIT_CONFIG_KEY_0:'user.name',GIT_CONFIG_VALUE_0:'Lifecycle Fixture',GIT_CONFIG_KEY_1:'user.email',GIT_CONFIG_VALUE_1:'dialkit-lifecycle@example.test'};
 const run=(args,ok=true)=>{const r=spawnSync(process.execPath,args,{cwd:dir,env,encoding:'utf8',timeout:180000,maxBuffer:64*1024*1024});if(ok)assert.equal(r.status,0,(r.stdout+r.stderr).slice(-5000));return r;};
 const studio=(...args)=>run(['src/platform/node/cli/studio.js',...args]);
 const build=state=>{run(['src/platform/node/build/build-manifest.js','--strict','--deploy']);run(['src/platform/node/check/check-modules.js']);run(['src/platform/node/check/typecheck.js']);run(['node_modules/vite/bin/vite.js','build']);if(state.startsWith('disabled')||state==='physically removed'){const output=fs.readdirSync(path.join(dir,'dist/assets')).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join(dir,'dist/assets',f),'utf8')).join('\n');assert.doesNotMatch(output,/studio-dialkit|Open DialKit/);}t.diagnostic(`${state}: boundaries, types and production build passed`);};
 studio('configure','--usage','personal','--recovery','--yes');
 const files=[];
 for(const [name,flag] of [['No System Lifecycle','--no-system'],['Product Lifecycle','--system']]) {
   run(['src/platform/modules/prototypes/node/create.js',name,flag,...(flag==='--system'?['product']:[])]);
   const folder=path.join(dir,'src/prototypes/lifecycle',name.toLowerCase().replaceAll(' ','-'));
   const file=path.join(folder,'prototype.tsx');const identity=fs.readFileSync(file,'utf8').split('\n')[0];
   const source=identity+`\n// @dialkit {"version":1,"published":true}\nimport {useBespokeControls,type DialConfig} from '@module/dialkit';\n${flag==='--system'?"import {Button} from '@/systems/product/components/button';":""}\nconst config={size:[32,16,64,1],nested:{gap:[16,0,40,1]}} satisfies DialConfig;\nexport default function View(){const values=useBespokeControls('Layout',config);return <${flag==='--system'?'Button':'button'} style={{fontSize:values.size,padding:values.nested.gap}}>Preserved design</${flag==='--system'?'Button':'button'}>}`;
   fs.writeFileSync(file,source);files.push({file,source,meta:fs.readFileSync(path.join(folder,'meta.json'),'utf8')});
 }
 build('enabled');
 const blocked=run(['src/platform/node/cli/studio.js','disable','dialkit'],false);assert.notEqual(blocked.status,0);assert.match(blocked.stdout+blocked.stderr,/detach.*dependent/i);
 const removal=run(['src/platform/node/cli/studio.js','remove','dialkit'],false);assert.notEqual(removal.status,0);assert.match(removal.stdout+removal.stderr,/depend/);
 for(const entry of files) {assert.equal(fs.readFileSync(entry.file,'utf8'),entry.source);const panels=[{id:'layout',name:'Layout',config:{size:[32,16,64,1],nested:{gap:[16,0,40,1]}},values:{size:47,nested:{gap:23}}}];const saved=transformSource(entry.source,panels,false);assert.match(saved,/47/);entry.detached=transformSource(saved,panels,true);fs.writeFileSync(entry.file,entry.detached);}
 studio('disable','dialkit');build('disabled after detachment');
 studio('enable','dialkit');
 for(const entry of files){const reattached=entry.source.replace('size:[32,','size:[47,').replace('gap:[16,','gap:[23,');fs.writeFileSync(entry.file,reattached);}
 build('re-enabled with connected controls');
 for(const entry of files)fs.writeFileSync(entry.file,entry.detached);
 for(const entry of files){assert.equal(fs.readFileSync(entry.file,'utf8'),entry.detached);assert.equal(fs.readFileSync(path.join(path.dirname(entry.file),'meta.json'),'utf8'),entry.meta);}
 studio('remove','dialkit');studio('remove','dialkit','--yes');assert.equal(fs.existsSync(path.join(dir,'src/modules/dialkit')),false);build('physically removed');
 for(const entry of files){assert.equal(fs.readFileSync(entry.file,'utf8'),entry.detached);assert.match(entry.detached,/"size": 47/);assert.match(entry.detached,/"gap": 23/);assert.doesNotMatch(entry.detached,/@module\/dialkit/);}
 const output=fs.readdirSync(path.join(dir,'dist/assets')).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join(dir,'dist/assets',f),'utf8')).join('\n');assert.doesNotMatch(output,/studio-dialkit|Open DialKit|Pick accent color/);
});
