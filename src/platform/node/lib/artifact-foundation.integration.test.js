import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { artifactFixture } from './fixtures/artifacts.js';

test('a public team file type joins mixed-artifact discovery, validation and production loading', () => {
  const fixture = artifactFixture();
  try {
    const { root, base, run, write } = fixture;
    write(base + '/draft.mmd', 'this is intentionally invalid');
    write(base + '/_helper.mermaid', 'flowchart LR\n A-->B');
    assert.match(run('src/modules/fixture/node/public-api.js'), /Public identity and settings validators passed/);
    const cli = (...args) => run('src/platform/node/cli/studio.js', ...args);
    const before = ['meta.json', 'main.tsx', 'notes.md', 'board.excalidraw'].map(file =>
      fs.readFileSync(path.join(root, base, file), 'utf8'),
    );
    const preview = JSON.parse(cli('identify', base, '--json'));
    assert.deepEqual(
      ['meta.json', 'main.tsx', 'notes.md', 'board.excalidraw'].map(file =>
        fs.readFileSync(path.join(root, base, file), 'utf8'),
      ),
      before,
    );
    assert.ok(preview.changes.length > 0);
    cli('identify', base, '--yes');
    const identified = JSON.parse(cli('context', base, '--json'));
    assert.equal(identified.assignment.system, null);
    assert.equal(JSON.parse(cli('identify', base, '--json')).changes.length, 0);
    assert.equal(JSON.parse(cli('identity-audit', '--json')).missing.length, 0);
    run('src/platform/modules/prototypes/node/create.js', 'Empty runtime fixture', '--no-system');
    run('src/platform/modules/prototypes/node/create.js', 'Assigned empty runtime fixture');
    run(
      '--input-type=module',
      '--eval',
      `
      import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
      import {runOp} from './src/platform/node/build/files/ops.js';
      import {INSTALLED_FILE_TYPES} from './src/platform/node/lib/file-types.js';
      import {emptyView} from './src/platform/modules/view/lib/index.ts';
      const dir=path.resolve('src/prototypes/artifact-fixture/empty-runtime-fixture');
      runOp(dir,{op:'create',name:'review.tsx'});
      const sources=['prototype.tsx','review.tsx'].map(name=>fs.readFileSync(path.join(dir,name),'utf8'));
      const ids=sources.map(source=>INSTALLED_FILE_TYPES.view.identity.read(source));
      assert.ok(ids.every(Boolean)); assert.notEqual(ids[0],ids[1]);
      assert.deepEqual(sources.map(source=>INSTALLED_FILE_TYPES.view.check({source})),[[],[]]);
      assert.equal(emptyView(),null);
      assert.equal(JSON.parse(fs.readFileSync(dir+'/meta.json')).systemId,null);
      assert.ok(JSON.parse(fs.readFileSync('src/prototypes/artifact-fixture/assigned-empty-runtime-fixture/meta.json')).systemId);
    `,
    );
    run('src/platform/node/build/build-manifest.js', '--strict');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/prototypes/manifest.json')));
    const proto = manifest.prototypes.find(p => p.contributorKey === 'artifact-fixture' && p.id === 'mixed');
    assert.equal(proto.systemId, null);
    const items = JSON.parse(
      fs.readFileSync(path.join(root, 'public/prototypes/artifacts/artifact-fixture/mixed.json')),
    );
    assert.deepEqual(
      new Set(items.map(item => item.fileType)),
      new Set(['view', 'document', 'diagrams', 'canvas', 'fixture']),
    );
    assert.equal(new Set(items.map(item => item.studioId)).size, 6);
    assert.deepEqual(
      items
        .filter(item => item.fileType === 'diagrams')
        .map(item => item.path)
        .sort(),
      ['draft.mmd', 'flow.mermaid'],
    );
    assert.ok(!items.some(item => item.path === '_helper.mermaid'));
    assert.ok(items.every(item => item.studioId));
    const canvas = (...args) => run('src/platform/modules/canvas/cli.ts', base + '/board.excalidraw', ...args);
    const boardFile = path.join(root, base, 'board.excalidraw'),
      boardBefore = fs.readFileSync(boardFile, 'utf8');
    assert.ok(JSON.stringify(JSON.parse(canvas('artifacts'))).includes('main.tsx'));
    assert.equal(fs.readFileSync(boardFile, 'utf8'), boardBefore);
    canvas('create', JSON.stringify({ type: 'artifact', artifact: './main.tsx' }));
    const board = JSON.parse(fs.readFileSync(boardFile));
    assert.equal(board.studioId, JSON.parse(boardBefore).studioId);
    const viewId = items.find(item => item.path === 'main.tsx').studioId;
    assert.equal(
      board.elements.find(element => element.type === 'embeddable').link,
      '/prototypes/' + identified.prototype.studioId + '/artifacts/' + viewId,
    );
    const canvasAfter = fs.readFileSync(boardFile, 'utf8');
    const denied = spawnSync(
      process.execPath,
      [
        'src/platform/modules/canvas/cli.ts',
        base + '/board.excalidraw',
        'create',
        '{"type":"note","text":"Unauthorized"}',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...fixture.env, GIT_CONFIG_VALUE_0: 'Unknown Person', GIT_CONFIG_VALUE_1: 'unknown@example.invalid' },
      },
    );
    assert.equal(denied.status, 1, denied.stderr + denied.stdout);
    assert.equal(fs.readFileSync(boardFile, 'utf8'), canvasAfter);
    fs.renameSync(path.join(root, base), path.join(root, base + '-relocated'));
    try {
      assert.equal(
        JSON.parse(cli('context', base + '-relocated', '--json')).prototype.studioId,
        identified.prototype.studioId,
      );
      assert.equal(fs.readFileSync(path.join(root, base + '-relocated/board.excalidraw'), 'utf8'), canvasAfter);
    } finally {
      fs.renameSync(path.join(root, base + '-relocated'), path.join(root, base));
    }
    run('src/platform/node/check/check-modules.js');
    run('src/platform/node/check/typecheck.js');
    run('node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native');
    const emptyOutput = fs
      .readdirSync(path.join(root, 'dist/assets'))
      .filter(name => name.endsWith('.js'))
      .map(name => fs.readFileSync(path.join(root, 'dist/assets', name), 'utf8'))
      .join('');
    assert.ok(emptyOutput.includes('This view is empty'));
    const view = path.join(root, 'src/prototypes/artifact-fixture/empty-runtime-fixture/review.tsx');
    const identity = fs.readFileSync(view, 'utf8').split('\n')[0];
    fs.writeFileSync(
      view,
      identity + '\nexport default function Review(){return <div>__IMPLEMENTED_EMPTY_VIEW__</div>}\n',
    );
    assert.equal(fs.readFileSync(view, 'utf8').split('\n')[0], identity);
    run('src/platform/node/build/build-manifest.js', '--strict', '--deploy');
    run('node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native');
    const assets = fs.readdirSync(path.join(root, 'dist/assets'));
    const report = assets.find(file => /^fixture-report-.*\.json$/.test(file));
    assert.ok(report);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'dist/assets', report))), {
      message: '__PUBLIC_ASSET_PROOF__',
    });
    const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
    assert.ok(html.includes('/artifact-fixture/assets/'));
    const output = fs
      .readdirSync(path.join(root, 'dist/assets'))
      .filter(f => f.endsWith('.js'))
      .map(f => fs.readFileSync(path.join(root, 'dist/assets', f), 'utf8'))
      .join('');
    assert.ok(output.includes('__IMPLEMENTED_EMPTY_VIEW__'));
    assert.ok(output.includes('__ARTIFACT_EXTERNAL_PROOF__'));
    assert.ok(output.includes('__ARTIFACT_VIEW_PROOF__'));
  } finally {
    fixture.dispose();
  }
});

test('public source adapters follow moves, copies and disabled renderers; mixed artifacts survive a missing system locally', () => {
  const fixture = artifactFixture();
  try {
    const { root, base, run, write } = fixture;
    run('src/platform/node/cli/studio.js', 'identify', base, '--yes');
    const result = JSON.parse(
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
      const copy=duplicatePrototype({key:'artifact-fixture',id:'mixed',title:'Mixed copy'});
      const copied=path.resolve('src/prototypes/artifact-fixture/'+copy.id);
      const copiedMeta=JSON.parse(fs.readFileSync(copied+'/meta.json'));
      const copiedData=JSON.parse(fs.readFileSync(copied+'/model.fixture'));
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
      assert.throws(()=>duplicatePrototype({key:'artifact-fixture',id:'mixed',title:'Renamed copy'}), /already/);
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
      console.log(JSON.stringify({id:meta.studioId,viewId,self}));
    `,
      )
        .trim()
        .split('\n')
        .at(-1),
    );
    run('src/platform/node/cli/studio.js', 'disable', 'fixture');
    run('src/platform/node/cli/studio.js', 'disable', 'diagrams');
    run(
      '--input-type=module',
      '--eval',
      `
      import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
      import {runOp} from './src/platform/node/build/files/ops.js';
      import {buildManifest} from './src/platform/node/build/build-manifest.js';
      const dir=path.resolve('${base}');
      runOp(dir,{op:'rename',path:'renamed.tsx',name:'main.tsx'});
      assert.equal(JSON.parse(fs.readFileSync(dir+'/model.fixture')).links[0],'./main.tsx?mode=source#part');
      const proto=buildManifest({write:false,quiet:true}).manifest.prototypes.find(p=>p.studioId==='${result.id}');
      assert.ok(!proto.artifacts.some(item=>item.fileType==='fixture'));
      assert.ok(!proto.artifacts.some(item=>item.fileType==='diagrams'));
      assert.ok(proto.artifacts.some(item=>item.fileType==='document'));
      assert.ok(fs.existsSync(dir+'/flow.mermaid'));
      assert.equal(buildManifest({write:false,quiet:true}).manifest.platformReferences.find(group=>group.id==='diagrams').references.length,0);
    `,
    );
    run('src/platform/node/cli/studio.js', 'enable', 'fixture');
    run('src/platform/node/cli/studio.js', 'enable', 'diagrams');
    run('src/platform/node/cli/studio.js', 'create-system', 'fixture-system', '--yes');
    run(
      '--input-type=module',
      '--eval',
      `
      import fs from 'node:fs'; import {readDeclaration} from './src/platform/core/declarations.ts';
      const meta=JSON.parse(fs.readFileSync('${base}/meta.json'));
      const systemId=readDeclaration(fs.readFileSync('src/systems/fixture-system/system.ts','utf8')).value.studioId;
      const {spawnSync}=await import('node:child_process'); const assert=(await import('node:assert/strict')).default;
      for(const state of [{systemId},{systemId:null,rebuild:{targetSystemId:systemId,sourcePrototypeId:meta.studioId}}]) {
        fs.writeFileSync('${base}/meta.json',JSON.stringify({...meta,...state}));
        const refused=spawnSync(process.execPath,['src/platform/node/cli/studio.js','remove','fixture-system','--yes'],{encoding:'utf8'});
        assert.equal(refused.status,1,refused.stderr+refused.stdout);
        assert.ok((refused.stderr+refused.stdout).includes('artifact-fixture/mixed'));
        assert.ok(fs.existsSync('src/systems/fixture-system/system.ts'));
      }
      meta.systemId=systemId;
      fs.writeFileSync('${base}/meta.json',JSON.stringify(meta));
    `,
    );
    run(
      '--input-type=module',
      '--eval',
      `
      import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
      import {Readable} from 'node:stream';
      import filesPlugin from './src/platform/node/build/vite-files-plugin.js';
      import {readDeclaration} from './src/platform/core/declarations.ts';
      import {editDeclaration} from './src/platform/node/lib/studio-setup.js';
      import {writeProfiles} from './src/platform/node/lib/fixtures/contributors.js';
      const configFile='studio.config.json', previous=fs.readFileSync(configFile,'utf8');
      const systemFile='src/systems/fixture-system/system.ts', declaration=fs.readFileSync(systemFile,'utf8');
      const systemId=readDeclaration(declaration).value.studioId;
      writeProfiles(process.cwd(),{'route-admin':{name:'Route Admin',preferences:{onboarding:{welcomeDismissed:true},fixture:{ready:false}}}});
      const config=JSON.parse(previous);
      config.usage='team'; config.admins=[JSON.parse(fs.readFileSync('contributors/route-admin.json')).studioId];
      config.systemMaintainers[systemId]=[JSON.parse(fs.readFileSync('contributors/artifact-fixture.json')).studioId];
      const save=()=>fs.writeFileSync(configFile,JSON.stringify(config)); save();
      let handler;
      await filesPlugin().configureServer({middlewares:{use:(_path,fn)=>{handler=fn;}},watcher:{on(){}},ws:{send(){}},config:{logger:{error(){}}}});
      const request=async(url,body)=>{
        const req=Readable.from(body?[JSON.stringify(body)]:[]);
        req.method=body?'POST':'GET';req.url=url;req.headers={'sec-fetch-site':'same-origin'};
        const res={statusCode:0,setHeader(){},end(body){this.body=body;}};
        await handler(req,res,()=>assert.fail('Unexpected route fallback'));return res;
      };
      const source=body=>request('/systems/source',{systemId,path:'styles/theme.css',...body});
      try {
        const file=path.resolve('${base}/main.tsx'), originalRead=fs.readFileSync;
        const url='/file?contributor=artifact-fixture&prototype=mixed&path=main.tsx';
        fs.readFileSync=(name,...args)=>{if(name===file)throw new Error('Read failure');return originalRead(name,...args);};
        try {assert.equal((await request(url)).statusCode,500);} finally {fs.readFileSync=originalRead;}
        assert.equal((await request(url)).statusCode,200);
        assert.equal((await request('/prototype-duplicate',{contributor:'system-content',prototype:'studio:context',title:'Forbidden',system:null})).statusCode,403);
        assert.equal((await request('/documentation',{action:'write',path:'src/platform/README.md',content:'# Forbidden'})).statusCode,403);
        const read=await source({action:'read'}); assert.equal(read.statusCode,200);
        const theme=JSON.parse(read.body);
        assert.equal((await source({action:'write',base:theme.version,content:theme.content})).statusCode,200);
        assert.equal((await source({action:'write',base:'stale',content:'# Overwrite'})).statusCode,409);
        const themePath='src/systems/fixture-system/styles/theme.css';
        assert.equal(fs.readFileSync(themePath,'utf8'),theme.content);
        fs.renameSync(themePath,themePath+'.ordinary');fs.symlinkSync(path.basename(themePath)+'.ordinary',themePath);
        try {assert.equal((await source({action:'read'})).statusCode,404);} finally {fs.unlinkSync(themePath);fs.renameSync(themePath+'.ordinary',themePath);}
        assert.equal((await source({action:'read',path:'../other/system.ts'})).statusCode,400);
        assert.equal((await source({action:'read',systemId:'0000000000000000'})).statusCode,404);
        fs.writeFileSync(systemFile,editDeclaration(declaration,{status:'archived'}));
        try {assert.equal((await source({action:'write',base:theme.version,content:theme.content})).statusCode,404);} finally {fs.writeFileSync(systemFile,declaration);}
        fs.writeFileSync('src/systems/fixture-system/components/route-proof.tsx','export function RouteProof(){return null;}');
        assert.equal((await request('/op',{contributor:'systems',prototype:'fixture-system',op:'rename',path:'route-proof.tsx',name:'unsafe.tsx'})).statusCode,400);
        assert.ok(fs.existsSync('src/systems/fixture-system/components/route-proof.tsx'));
        assert.equal((await request('/systems/skill',{systemId,name:'route-proof',description:'A synthetic route check.'})).statusCode,200);
        assert.ok(fs.existsSync('src/systems/fixture-system/skills/route-proof/SKILL.md'));
        const docs=await request('/systems/component-docs',{systemId,component:'route-proof'});
        assert.equal(docs.statusCode,200);
        const written=JSON.parse(docs.body).written;
        assert.ok(written.some(file=>file.endsWith('.md'))); assert.ok(written.every(file=>fs.existsSync(file)));
        config.systemMaintainers[systemId]=[]; save();
        assert.equal((await source({action:'write',base:theme.version,content:theme.content})).statusCode,403);
      } finally {fs.writeFileSync(configFile,previous);fs.unlinkSync('contributors/route-admin.json');}
    `,
    );
    write(
      'src/systems/fixture-system/components/proof.tsx',
      'export function Proof(){return <div>Assigned view</div>}',
    );
    const view = path.join(root, base, 'main.tsx');
    fs.writeFileSync(
      view,
      fs
        .readFileSync(view, 'utf8')
        .replace('export default', "import {Proof} from '@/systems/fixture-system/components/proof';\nexport default")
        .replace('<div>__ARTIFACT_VIEW_PROOF__</div>', '<Proof/>'),
    );
    run('src/platform/node/cli/studio.js', 'delete-system', 'fixture-system', '--yes');
    run(
      '--input-type=module',
      '--eval',
      `
      import assert from 'node:assert/strict';
      import {buildManifest} from './src/platform/node/build/build-manifest.js';
      import {FILE_TYPES} from './src/platform/node/lib/file-types.js';
      import {artifactAvailability} from './src/platform/core/fileTypes.ts';
      import globs from './src/platform/node/build/vite-globs-plugin.js';
      const manifest=buildManifest({write:false,quiet:true}).manifest;
      const proto=manifest.prototypes.find(p=>p.studioId==='${result.id}');
      assert.ok(proto.systemMissing);
      const context={local:true,editable:true,present:true,renderer:true,scope:'prototype',systemMissing:proto.systemMissing};
      assert.equal(artifactAvailability(FILE_TYPES.view,context).view.available,false);
      assert.equal(artifactAvailability(FILE_TYPES.view,context).source.available,true);
      for(const type of ['document','diagrams','canvas','fixture'])assert.equal(artifactAvailability(FILE_TYPES[type],context).view.available,true);
      const plugin=globs(); plugin.configResolved({command:'serve'}); plugin.buildStart();
      const input="const files=import.meta.glob(['/__studio_globs__/*']);";
      assert.match(plugin.transform(input,process.cwd()+'/src/platform/modules/view/loader.ts').code,/!\\/prototypes\\/artifact-fixture\\/mixed\\/\\*\\*/);
      assert.ok(!plugin.transform(input,process.cwd()+'/src/platform/modules/document/loader.ts').code.includes('!/prototypes/artifact-fixture/mixed/**'));
      assert.ok(!buildManifest({deploy:true,write:false,quiet:true}).manifest.prototypes.some(p=>p.studioId===proto.studioId));
    `,
    );
    run('src/platform/node/build/build-manifest.js', '--strict', '--deploy');
    run('src/platform/node/check/check-modules.js');
    run('src/platform/node/check/typecheck.js');
    run('node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native');
    const output = fs
      .readdirSync(path.join(root, 'dist/assets'))
      .filter(f => f.endsWith('.js'))
      .map(f => fs.readFileSync(path.join(root, 'dist/assets', f), 'utf8'))
      .join('');
    assert.ok(!output.includes('Assigned view'));
    run('src/platform/node/cli/studio.js', 'remove', 'fixture', '--yes');
    assert.ok(fs.existsSync(path.join(root, base, 'model.fixture')));
    run('src/platform/node/build/build-manifest.js', '--strict', '--deploy');
    run('src/platform/node/check/check-modules.js');
  } finally {
    fixture.dispose();
  }
});
