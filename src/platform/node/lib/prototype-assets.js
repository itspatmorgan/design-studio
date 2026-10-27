import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prototypeSourceForIdentity } from './resource-directory.js';
import { canonicalDirectory } from './safe-paths.js';
import { canPerform } from '../../core/permissions.ts';
import { readContributors } from './contributors.js';
import { readPersistedStudioConfig } from './persisted-studio-config.js';
const extensions = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg'};
// Content-addressed, prototype-local files. No caller-selected filesystem destination.
export function putPrototypeImage(root, {actor,prototypeId,dataUrl}) {
  const source=prototypeSourceForIdentity(root,prototypeId);
  const folder=typeof source==='string'?source:source.path;
  const relative=folder.startsWith('src/')?folder:path.relative(root,folder);
  const dir=path.resolve(root,relative);
  if(!/^src\/prototypes\/[^/]+\/[^/]+$/.test(relative.split(path.sep).join('/')) || !canonicalDirectory(dir,root)) throw Error('Choose an available prototype.');
  const {contributors,problems}=readContributors(root);
  const owner=relative.split('\\').join('/').split('/')[2];
  const meta=JSON.parse(fs.readFileSync(path.join(dir,'meta.json'),'utf8'));
  const {config}=readPersistedStudioConfig(root);
  if(problems.length || meta.ownerContributorId!==contributors[owner]?.studioId || !canPerform(config,actor,Object.keys(contributors),{kind:'prototype',owner},'edit')) throw Object.assign(Error('You cannot add assets to this prototype.'),{status:403});
  const match=typeof dataUrl==='string' && /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
  if(!match) throw Error('Choose a supported image upload.');
  const bytes=Buffer.from(match[2],'base64');
  if(!bytes.length || bytes.length>750*1024) throw Object.assign(Error('Keep prototype images under 750 KB.'),{status:413});
  const assetDir=path.join(dir,'assets');
  if(!fs.existsSync(assetDir))fs.mkdirSync(assetDir);
  if(!canonicalDirectory(assetDir,dir)||fs.lstatSync(assetDir).isSymbolicLink())throw Error('Assets must use an ordinary prototype directory.');
  const name=`image-${createHash('sha256').update(bytes).digest('hex')}.${extensions[match[1]]}`;
  const target=path.join(assetDir,name);
  if(fs.existsSync(target)) {
    if(fs.lstatSync(target).isSymbolicLink()||!fs.lstatSync(target).isFile()||!fs.readFileSync(target).equals(bytes))throw Error('Image asset conflicts with an existing file.');
  }else fs.writeFileSync(target,bytes,{flag:'wx'});
  return {url:`/${relative.split(path.sep).join('/')}/assets/${name}`};
}
