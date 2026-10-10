import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { prepareShadcn } from './prepare-shadcn.js';

test('staging isolates all upstream writes and preserves the target', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'curation-fixture-'));
  let plan;
  try {
    fs.mkdirSync(path.join(root,'src/systems/example'),{recursive:true});
    fs.mkdirSync(path.join(root,'node_modules/shadcn'),{recursive:true});
    const declaration="export default { role: 'prototype', status: 'active', studioId: '4f3m7z08hk5a0k53' };\n";
    fs.writeFileSync(path.join(root,'src/systems/example/system.ts'),declaration);
    fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({packageManager:'pnpm@12.8.2',dependencies:{react:'19', 'react-dom':'19'},devDependencies:{tailwindcss:'4',vite:'8'}}));
    fs.writeFileSync(path.join(root,'node_modules/shadcn/package.json'),JSON.stringify({version:'4.21.0'}));
    plan=prepareShadcn(root,'example',{preset:'nova',components:['button','dialog']});
    assert.ok(!plan.workspace.startsWith(root));
    assert.equal(fs.readFileSync(path.join(root,'src/systems/example/system.ts'),'utf8'),declaration);
    assert.deepEqual(fs.readdirSync(path.join(root,'src/systems/example')),['system.ts']);
    assert.equal(plan.source.cliVersion,'4.21.0');
    assert.equal(plan.target.studioId,'4f3m7z08hk5a0k53');
    for (const command of plan.commands) assert.ok(command.includes(plan.workspace));
    assert.ok(plan.commands[2].includes('--dry-run'));
    assert.ok(!fs.existsSync(path.join(root,'components.json')));
    assert.ok(!fs.existsSync(path.join(plan.workspace,'node_modules')));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(plan.workspace,'curation-plan.json'),'utf8')),plan);
    assert.throws(()=>prepareShadcn(root,'../example'),/source key/);
    assert.throws(()=>prepareShadcn(root,'example',{preset:'https://example.com'}),/preset code/);
    assert.throws(()=>prepareShadcn(root,'example',{components:['../escape']}),/by name/);
    fs.writeFileSync(path.join(root,'src/systems/example/system.ts'),"export default {role:'platform',status:'active'};");
    assert.throws(()=>prepareShadcn(root,'example'),/active prototype/);
  } finally { if(plan)fs.rmSync(plan.workspace,{recursive:true,force:true});fs.rmSync(root,{recursive:true,force:true}); }
});
