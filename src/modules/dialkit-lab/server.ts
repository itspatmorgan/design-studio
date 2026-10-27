import { fileURLToPath } from 'node:url';
import type { ModuleServer } from '#studio/module';
import { putPrototypeImage } from '#studio/assets';
import { transformSource } from './node/source.ts';
import { validPacket, channel } from './lib/wire.ts';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export default {
  transform: ({body})=>{
    try {
      const request=body as {source:string;panels:unknown[];remove:boolean;assetBase:string;sourcePath:string};
      if(!request || typeof request.source!=='string'||request.source.length>750*1024||!Array.isArray(request.panels)||request.panels.length>64||typeof request.remove!=='boolean'||typeof request.assetBase!=='string')throw Error('Invalid DialKit source request.');
      for(const panel of request.panels)if(!validPacket({channel,version:1,session:'transform',runtime:'transform',identity:'transform',sequence:1,kind:'snapshot',panel}))throw Error('Invalid DialKit values.');
      return {body:{content:transformSource(request.source,request.panels as Parameters<typeof transformSource>[1],request.remove,request.assetBase,request.sourcePath)}};
    } catch(error) {return {status:422,body:{error:error instanceof Error?error.message:'Could not prepare source.'}};}
  },
  image: ({me,body})=>{
    try {
      const request=body as {prototypeId:string;dataUrl:string};
      if(!request||typeof request.prototypeId!=='string'||typeof request.dataUrl!=='string')throw Error('Invalid image request.');
      return {body:putPrototypeImage(root,{actor:me,prototypeId:request.prototypeId,dataUrl:request.dataUrl})};
    }catch(error){return {status:typeof error==='object'&&error&&'status' in error?Number(error.status):422,body:{error:error instanceof Error?error.message:'Could not save image.'}};}
  },
} satisfies ModuleServer;
