import{readFileSync,writeFileSync}from'node:fs';
import{spawn}from'node:child_process';
import ts from 'typescript';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url);
const dir=pathToFileURL(resolve(process.argv[2]||'.benchmark-results')+'/');const path=name=>new URL(name,dir);mkdirSync(fileURLToPath(dir),{recursive:true});
const saveText=process.argv.includes('--save-text');
if(saveText)mkdirSync(fileURLToPath(path('texts/')),{recursive:true});
const baseline=JSON.parse(readFileSync(path('report.json'),'utf8'));
const syntax=text=>{const code=text.match(/```ts\s*\n([\s\S]*?)\n```/)?.[1];if(!code)return {snippetFound:false};return {snippetFound:true,syntaxErrors:ts.createSourceFile('example.ts',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length};};
const cases=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8')).extraction;
const report={dateUtc:new Date().toISOString(),transport:'Built Convex component read action → TinyFish HTML → deterministic Markdown',cases:[]};
const norm=s=>s.normalize('NFKC').replace(/[`*_]/g,'').replace(/\s+/g,' ').toLowerCase();
for(let i=0;i<cases.length;i+=4){const batch=cases.slice(i,i+4);const start=performance.now();const data=await new Promise((resolve,reject)=>{let out='',err='';const child=spawn('npx',['convex','run','web:read',JSON.stringify({urls:batch.map(c=>c.url),ttl:0,per_url_timeout_ms:45000})],{cwd:root,env:{...process.env,CONVEX_AGENT_MODE:'anonymous'}});child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('close',code=>code?reject(Error('Convex read action failed; inspect local backend')):resolve(JSON.parse(out)));});
for(const c of batch){const p=data.results.find(p=>p.url===c.url);const text=typeof p?.text==='string'?p.text:'';const checks=c.checks.map(alternatives=>({alternatives,passed:alternatives.some(t=>norm(text).includes(norm(t)))}));if(saveText&&text)writeFileSync(path(`texts/${c.id}-read.txt`),text);const item={id:c.id,url:c.url,extracted:!!text,checksPassed:checks.filter(x=>x.passed).length,checksTotal:checks.length,allChecksPassed:!!text&&checks.every(x=>x.passed),characters:text.length,codeFencePairs:Math.floor((text.match(/```/g)||[]).length/2),checks,...(c.id==='raw-markdown'?{codeSyntax:syntax(text)}:{}),...(!p?{errorCode:data.errors.find(e=>e.url===c.url)?.error||'NO_CONTENT'}:{})};report.cases.push(item);console.log(JSON.stringify({...item,checks:undefined}));}report.batchDurationMs=(report.batchDurationMs||[]).concat(Math.round(performance.now()-start));writeFileSync(path('read-report.json'),JSON.stringify(report,null,2));}
const raw=baseline.extraction.find(c=>c.id==='raw-markdown');
report.rawMarkdownCodeSyntax={tinyfish:raw.observations.find(o=>o.provider==='tinyfish').codeSyntax,firecrawl:raw.observations.find(o=>o.provider==='firecrawl').codeSyntax,read:report.cases.find(c=>c.id==='raw-markdown').codeSyntax};report.passed=report.cases.every(c=>c.allChecksPassed)&&report.rawMarkdownCodeSyntax.read.syntaxErrors===0;writeFileSync(path('read-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,codeSyntax:report.rawMarkdownCodeSyntax}));
