import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { artifactFixture } from './fixtures/artifacts.js';

test('a public team file type joins mixed-artifact discovery, validation and production loading', () => {
  const fixture = artifactFixture();
  try {
    const { root, base, run } = fixture;
    assert.match(run('src/modules/fixture/node/public-api.js'), /Public identity and settings validators passed/);
    run('src/platform/node/cli/studio.js', 'identify', base, '--yes');
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
    assert.equal(new Set(items.map(item => item.studioId)).size, 5);
    assert.ok(items.every(item => item.studioId));
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
      assert.notEqual(copiedData.studioId,data.studioId);
      assert.equal(copiedData.links[1],'/prototypes/'+copiedMeta.studioId+'/artifacts/'+copiedData.studioId);
      assert.equal(JSON.parse(fs.readFileSync(source)).links[1],self);
      console.log(JSON.stringify({id:meta.studioId,viewId,self}));
    `,
      )
        .trim()
        .split('\n')
        .at(-1),
    );
    run('src/platform/node/cli/studio.js', 'disable', 'fixture');
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
    `,
    );
    run('src/platform/node/cli/studio.js', 'enable', 'fixture');
    run('src/platform/node/cli/studio.js', 'create-system', 'fixture-system', '--yes');
    run(
      '--input-type=module',
      '--eval',
      `
      import fs from 'node:fs'; import {readDeclaration} from './src/platform/core/declarations.ts';
      const meta=JSON.parse(fs.readFileSync('${base}/meta.json'));
      meta.systemId=readDeclaration(fs.readFileSync('src/systems/fixture-system/system.ts','utf8')).value.studioId;
      fs.writeFileSync('${base}/meta.json',JSON.stringify(meta));
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
