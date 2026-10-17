import { test } from 'node:test';
import { artifactFixture } from './fixtures/artifacts.js';

test('artifact authoring preserves identities, remaps references, rejects collisions and cleans up failed copies', () => {
  const fixture = artifactFixture();
  try {
    const { base, run } = fixture;
    run('src/platform/node/cli/studio.js', 'identify', base, '--yes');
    run(
      '--input-type=module',
      '--eval',
      `
      import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
      import {runOp} from './src/platform/node/build/files/ops.js';
      import {duplicatePrototype} from './src/platform/modules/prototypes/node/duplicate.js';
      import {createPrototype,renamePrototype} from './src/platform/modules/prototypes/node/create.js';
      import {DEFAULT_SYSTEM,PROTOTYPE_SYSTEMS} from './src/platform/modules/systems/node/systems.js';
      import {INSTALLED_FILE_TYPES} from './src/platform/node/lib/file-types.js';
      import {canChange} from './src/platform/node/build/files/policy.js';
      const dir=path.resolve('${base}');
      const meta=JSON.parse(fs.readFileSync(dir+'/meta.json'));
      const source=dir+'/model.fixture';
      const data=JSON.parse(fs.readFileSync(source));
      const viewId=INSTALLED_FILE_TYPES.view.identity.read(fs.readFileSync(dir+'/main.tsx','utf8'));
      const self='/prototypes/'+meta.studioId+'/artifacts/'+data.studioId;
      fs.writeFileSync(source,JSON.stringify({...data,links:['./main.tsx?mode=source#part',self]}));
      assert.equal(canChange('artifact-fixture','artifact-fixture',dir),true);
      assert.equal(canChange(null,'artifact-fixture',dir),false);
      const notesBefore=fs.readFileSync(dir+'/notes.md','utf8');
      const validSource=fs.readFileSync(source,'utf8');
      fs.writeFileSync(source,'{invalid JSON');
      assert.throws(()=>runOp(dir,{op:'rename',path:'main.tsx',name:'renamed.tsx'}));
      assert.ok(fs.existsSync(dir+'/main.tsx'));
      assert.ok(!fs.existsSync(dir+'/renamed.tsx'));
      assert.equal(fs.readFileSync(dir+'/notes.md','utf8'),notesBefore);
      fs.writeFileSync(source,validSource);
      runOp(dir,{op:'rename',path:'main.tsx',name:'renamed.tsx'});
      assert.equal(INSTALLED_FILE_TYPES.view.identity.read(fs.readFileSync(dir+'/renamed.tsx','utf8')),viewId);
      assert.equal(JSON.parse(fs.readFileSync(source)).links[0],'./renamed.tsx?mode=source#part');
      assert.match(fs.readFileSync(dir+'/notes.md','utf8'),/renamed.tsx/);
      for(const [file,content] of [['_copy-fixture/nested/data.txt','retained data'],['_copy-fixture/node_modules/ignored.txt','excluded'],['.trash/ignored.txt','excluded']]) {
        fs.mkdirSync(path.dirname(dir+'/'+file),{recursive:true}); fs.writeFileSync(dir+'/'+file,content);
      }
      const sourceBeforeCopy=fs.readFileSync(source,'utf8');
      const failed=path.resolve('src/prototypes/artifact-fixture/failed-copy'), originalCopy=fs.cpSync;
      let copiedBeforeFailure=false;
      fs.cpSync=(from,to,options)=>{originalCopy(from,to,options); if(fs.existsSync(to)){copiedBeforeFailure=true;throw new Error('Injected copy failure');}};
      try {assert.throws(()=>duplicatePrototype({key:'artifact-fixture',id:'mixed',title:'Failed copy'}),/Injected copy failure/);}
      finally {fs.cpSync=originalCopy;}
      assert.equal(copiedBeforeFailure,true);
      assert.equal(fs.existsSync(failed),false);
      assert.equal(fs.readFileSync(source,'utf8'),sourceBeforeCopy);
      const racing=path.resolve('src/prototypes/artifact-fixture/racing-copy'), originalMkdir=fs.mkdirSync;
      fs.mkdirSync=(target,...args)=>{if(target===racing){originalMkdir(target);fs.writeFileSync(target+'/retained.txt','existing');}return originalMkdir(target,...args);};
      try {
        assert.throws(()=>duplicatePrototype({key:'artifact-fixture',id:'mixed',title:'Racing copy'}),error=>error.code==='EEXIST');
        assert.equal(fs.readFileSync(racing+'/retained.txt','utf8'),'existing');
      } finally {fs.mkdirSync=originalMkdir;fs.rmSync(racing,{recursive:true,force:true});}
      const copy=duplicatePrototype({key:'artifact-fixture',id:'mixed',title:'Mixed copy'});
      const copied=path.resolve('src/prototypes/artifact-fixture/'+copy.id);
      const copiedMeta=JSON.parse(fs.readFileSync(copied+'/meta.json'));
      const copiedData=JSON.parse(fs.readFileSync(copied+'/model.fixture'));
      assert.equal(fs.readFileSync(copied+'/_copy-fixture/nested/data.txt','utf8'),'retained data');
      for(const excluded of ['.trash','_copy-fixture/node_modules'])assert.equal(fs.existsSync(copied+'/'+excluded),false);
      assert.notEqual(copiedMeta.studioId,meta.studioId);
      assert.equal(copiedMeta.systemId,null); assert.equal(copiedMeta.rebuild,undefined);
      assert.notEqual(copiedData.studioId,data.studioId);
      assert.equal(copiedData.links[1],'/prototypes/'+copiedMeta.studioId+'/artifacts/'+copiedData.studioId);
      assert.equal(JSON.parse(fs.readFileSync(source)).links[1],self);
      const renamed=renamePrototype({key:'artifact-fixture',id:copy.id,title:'Renamed copy'});
      const renamedDir=path.resolve('src/prototypes/artifact-fixture/'+renamed.id);
      assert.equal(fs.existsSync(copied),false);
      assert.equal(JSON.parse(fs.readFileSync(renamedDir+'/meta.json')).studioId,copiedMeta.studioId);
      assert.equal(JSON.parse(fs.readFileSync(renamedDir+'/model.fixture')).links[1],copiedData.links[1]);
      assert.throws(()=>renamePrototype({key:'artifact-fixture',id:renamed.id,title:'Mixed'}), /already/);
      for(const operation of [()=>createPrototype({key:'artifact-fixture',title:'Invalid',system:'missing'}),()=>duplicatePrototype({key:'artifact-fixture',id:'mixed',title:'Invalid',system:'missing'})]) {
        assert.throws(operation,/installed prototype system/);
        assert.equal(fs.existsSync('src/prototypes/artifact-fixture/invalid'),false);
      }
      const occupied=fs.readFileSync(renamedDir+'/meta.json','utf8');
      assert.throws(()=>duplicatePrototype({key:'artifact-fixture',id:'mixed',title:'Renamed copy'}), /already/);
      assert.equal(fs.readFileSync(renamedDir+'/meta.json','utf8'),occupied);
      fs.symlinkSync(process.cwd(),dir+'/outside');
      try {assert.throws(()=>duplicatePrototype({key:'artifact-fixture',id:'mixed',title:'Linked copy'}), /symbolic links/); assert.equal(fs.existsSync('src/prototypes/artifact-fixture/linked-copy'),false);}
      finally {fs.unlinkSync(dir+'/outside');}
      const assigned=createPrototype({key:'artifact-fixture',title:'Assigned source',system:DEFAULT_SYSTEM});
      const assignedDir='src/prototypes/artifact-fixture/'+assigned.slug;
      const assignedMeta=JSON.parse(fs.readFileSync(assignedDir+'/meta.json'));
      const bytes=fs.readFileSync(dir+'/meta.json','utf8');
      for(const [id,title,target,sourceSystem,sourceId] of [['mixed','Assigned rebuild',DEFAULT_SYSTEM,null,meta.studioId],[assigned.slug,'Unassigned rebuild',null,PROTOTYPE_SYSTEMS[DEFAULT_SYSTEM].studioId,assignedMeta.studioId]]) {
        const rebuild=duplicatePrototype({key:'artifact-fixture',id,title,system:target});
        const stored=JSON.parse(fs.readFileSync('src/prototypes/artifact-fixture/'+rebuild.id+'/meta.json'));
        assert.equal(stored.systemId,sourceSystem);
        assert.deepEqual(stored.rebuild,{targetSystemId:target===null?null:PROTOTYPE_SYSTEMS[target].studioId,sourcePrototypeId:sourceId});
        const projected=rebuild.manifest.prototypes.find(proto=>proto.id===rebuild.id);
        assert.equal(projected.system,sourceSystem===null?null:DEFAULT_SYSTEM);
        assert.equal(projected.rebuild.targetSystemKey,target);
        assert.equal(projected.rebuild.sourcePrototypeId,sourceId);
        assert.equal(projected.rebuild.sourcePath,'src/prototypes/artifact-fixture/'+id);
      }
      assert.equal(fs.readFileSync(dir+'/meta.json','utf8'),bytes);
      assert.equal(assignedMeta.systemId,PROTOTYPE_SYSTEMS[DEFAULT_SYSTEM].studioId);
    `,
    );
  } finally {
    fixture.dispose();
  }
});
