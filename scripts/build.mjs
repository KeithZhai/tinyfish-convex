import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const stage=mkdtempSync(join(root,'.dist-build-'));
const dist=join(root,'dist');
function files(dir,prefix=''){
 return readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(join(dir,item.name),join(prefix,item.name)):[join(prefix,item.name)]);
}
try{
 // Do not remove the working component while Convex is watching its imports.
 execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'-p','tsconfig.build.json','--outDir',stage],{cwd:root,stdio:'inherit'});
 const generated=files(stage);
 // New dependencies must exist before rewritten modules can import them.
 generated.sort((a,b)=>Number(existsSync(join(dist,a)))-Number(existsSync(join(dist,b))));
 mkdirSync(dist,{recursive:true});
 for(const name of generated){
  const target=join(dist,name),temporary=target+'.buildtmp';
  mkdirSync(dirname(target),{recursive:true});
  copyFileSync(join(stage,name),temporary);renameSync(temporary,target);
 }
 const keep=new Set(generated);
 for(const name of files(dist))if(!keep.has(name))rmSync(join(dist,name));
}finally{rmSync(stage,{recursive:true,force:true});}
