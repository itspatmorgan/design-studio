// Run with: mise exec -- node experiments/dialkit/compatibility/setup.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const fixture = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(fixture, '../../..');
const run = (...args) => execFileSync('pnpm', args, { cwd: root, encoding: 'utf8' });
const owner = execFileSync(process.execPath, ['src/platform/node/cli/resolve-contributor.js'], {cwd:root,encoding:'utf8'}).trim();
if (!/^[a-z0-9-]+$/.test(owner)) throw Error('Resolve a contributor first');
for (const [slug,title,flag,label] of [
  ['dialkit-controls-no-system','DialKit Controls No System','--no-system','No system'],
  ['dialkit-controls-product','DialKit Controls Product','--system','Product system'],
]) {
  const folder=path.join(root,'src/prototypes',owner,slug);
  if(fs.existsSync(folder)){console.log(`Preserved existing ${slug}`);continue;}
  console.log(run('new',title,flag,...(flag==='--system'?['product']:[])));
  const initial=path.join(folder,'prototype.tsx');
  const identity=fs.readFileSync(initial,'utf8').split('\n')[0];
  let source=fs.readFileSync(path.join(fixture,'controls.tsx'),'utf8').replaceAll('CONTEXT_LABEL',label).replaceAll('SCOPE_KEY',slug);
  if(flag==='--system')source=source.replace('// SYSTEM_IMPORT',"import { Button } from '@/systems/product/components/button';").replace('<button className={styles.button}','<Button className={styles.button}').replace('>Try the prototype</button>','>Try the prototype</Button>');
  fs.renameSync(initial,path.join(folder,'controls.tsx'));
  fs.writeFileSync(path.join(folder,'controls.tsx'),identity+'\n'+source);
  fs.copyFileSync(path.join(fixture,'_compatibility.module.css'),path.join(folder,'_compatibility.module.css'));
  const metaPath=path.join(folder,'meta.json');const meta=JSON.parse(fs.readFileSync(metaPath,'utf8'));meta.order=['controls.tsx'];fs.writeFileSync(metaPath,JSON.stringify(meta,null,2)+'\n');
  run('studio','identify',folder,'--json');console.log(run('studio','identify',folder,'--yes'));
  console.log(`/prototypes/${meta.studioId}`);
}
