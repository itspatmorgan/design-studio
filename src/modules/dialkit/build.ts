import fs from 'node:fs';
import path from 'node:path';
import type { ModuleBuild } from '#studio/module';
import { inspectSource } from './node/source.ts';
export type Attachments = Record<string,{attached:boolean;connected:boolean}>;
export default {manifest:({root})=>{
  const data: Attachments={};
  for(const file of fs.globSync('src/prototypes/*/*/**/*.tsx',{cwd:root})) {
    const source=fs.readFileSync(path.join(root,file),'utf8');
    const id=/\/\*\* @studio-id ([a-z0-9]+) \*\//.exec(source)?.[1];
    if(id) {const state=inspectSource(source);if(state.attached)data[id]=state;}
  }
  return {data,errors:0};
}} satisfies ModuleBuild<Attachments>;
