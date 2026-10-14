import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const cwd=fileURLToPath(new URL('..',import.meta.url));
let key=process.env.TINYFISH_API_KEY;
if(!key && process.argv.includes('--use-cli-key')) {
 try { key=JSON.parse(readFileSync(join(homedir(),'.tinyfish','config.json'),'utf8')).api_key; } catch {}
}
if(!key) { console.error('Set TINYFISH_API_KEY in your shell, or run npm run demo -- --use-cli-key after tinyfish auth login. Never paste a key into the browser.'); process.exit(1); }
const env={...process.env,CONVEX_AGENT_MODE:'anonymous',TINYFISH_LOCAL_DEMO:'1'};
function run(args,input){const r=spawnSync('npx',args,{cwd,env,input,encoding:'utf8'});if(r.error)throw r.error;return r;}
const built=spawnSync('npm',['run','build'],{cwd,stdio:'inherit'});if(built.status)process.exit(built.status);
console.log('Preparing a local Convex deployment…');
const setup=run(['convex','dev','--once','--typecheck','enable']);
if(setup.status && !/MissingEnvironmentVariables|TINYFISH_API_KEY/.test(setup.stderr)){console.error('Local Convex setup failed. Run npx convex dev to inspect deployment configuration.');process.exit(1);}
const configured=run(['convex','env','set','TINYFISH_API_KEY'],key);
key=undefined;
if(configured.status){console.error('Could not configure TINYFISH_API_KEY. Credential output was suppressed.');process.exit(1);}
console.log('Real TinyFish key configured on local Convex. Starting the live browser demo.');
const child=spawn('npx',['convex','dev','--start','npm run example:dev'],{cwd,env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
