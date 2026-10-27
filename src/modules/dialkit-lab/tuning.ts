import type { Panel } from './lib/wire';
export type Tuning = { identity:string; sourceVersion:string; ready:boolean; panels:Panel[]; capture?:()=>Promise<Panel[]> };
let current:Tuning|null=null;
export const currentTuning=(identity:string)=>current?.identity===identity?current:null;
export function reportTuning(next:Tuning) {current=next;return()=>{if(current===next)current=null;};}
