import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const dir=resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--'))||'.benchmark-results');
const manifestBytes=readFileSync(new URL('./cases.json',import.meta.url));
const manifest=JSON.parse(manifestBytes);
let tinyKey=process.env.TINYFISH_API_KEY;
if(!tinyKey&&process.argv.includes('--use-cli-key')){try{tinyKey=JSON.parse(readFileSync(join(homedir(),'.tinyfish','config.json'),'utf8')).api_key;}catch{throw Error('Unable to read the configured TinyFish CLI key. Supply TINYFISH_API_KEY through your secret workflow.');}}
const fireKey=process.env.FIRECRAWL_API_KEY;
if(!tinyKey||(!fireKey&&!process.argv.includes('--firecrawl-keyless')))throw Error('Supply provider keys or explicitly use --use-cli-key --firecrawl-keyless.');
const saveText=process.argv.includes('--save-text');
mkdirSync(dir,{recursive:true});
if(saveText)mkdirSync(join(dir,'texts'),{recursive:true});
const stopped=new Set();
const report={startedAtUtc:new Date().toISOString(),manifestSha256:createHash('sha256').update(manifestBytes).digest('hex'),transport:'Direct REST, single-URL pairs; no Convex CLI overhead',tinyfishAuth:'Configured user API key; account tier not ranked',firecrawlAuth:fireKey?'Configured user API key':'Official keyless free tier',cachePolicy:{tinyfish:'ttl=0',firecrawl:'maxAge=0'},limitations:['One exploratory pass; no general superiority claim','Lexical content checks are coverage proxies, not full semantic-quality scores','Expected-primary-source retrieval is not a complete relevance judgment','Account tiers and server paths differ; latency is observational','No measured dollar-cost comparison'],extraction:[],search:[]};
const syntax=text=>{const code=text.match(/```ts\s*\n([\s\S]*?)\n```/)?.[1];if(!code)return {snippetFound:false};return {snippetFound:true,syntaxErrors:ts.createSourceFile('example.ts',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length};};
const norm=s=>s.normalize('NFKC').replace(/[`*_]/g,'').replace(/\s+/g,' ').toLowerCase();
async function call(provider,kind,c){
 if(stopped.has(provider))return {provider,skipped:'Provider refused keyless access or rate-limited; no bypass attempted'};
 const url=provider==='tinyfish'?(kind==='search'?'https://api.search.tinyfish.ai/':'https://api.fetch.tinyfish.ai/'):`https://api.firecrawl.dev/v2/${kind==='search'?'search':'scrape'}`;
 let endpoint=url,body;
 if(kind==='search'){
  if(provider==='tinyfish'){const q=new URL(url);q.searchParams.set('query',c.query);if(c.domains)q.searchParams.set('include_domains',c.domains.join(','));endpoint=q.toString();}
  else body={query:c.query,limit:5,sources:['web'],domainTools:false,highlights:false,timeout:45000,...(c.domains?{includeDomains:c.domains}:{})};
 }else body=provider==='tinyfish'?{urls:[c.url],format:'markdown',ttl:0,per_url_timeout_ms:45000}:{url:c.url,formats:['markdown'],onlyMainContent:true,maxAge:0,timeout:45000};
 const start=performance.now();
 try{
  const r=await fetch(endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(provider==='tinyfish'?{'X-API-Key':tinyKey}:fireKey?{Authorization:`Bearer ${fireKey}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(65000)});
  const data=await r.json();const ms=Math.round(performance.now()-start);
  if(!r.ok){if(r.status===429||(provider==='firecrawl'&&!fireKey&&r.status===403))stopped.add(provider);return {provider,status:r.status,durationMs:ms,accepted:false,errorCode:typeof data.error?.code==='string'?data.error.code:'HTTP_ERROR',...(stopped.has(provider)?{accessLimited:true}:{})};}
  if(kind==='search'){
   const results=(provider==='tinyfish'?data.results:data.data?.web||[]).slice(0,5);
   const urls=results.map(x=>x.url);const rank=urls.findIndex(raw=>{try{const u=new URL(raw);return u.hostname===c.targetHost&&u.pathname.includes(c.targetPath);}catch{return false;}})+1;
   return {provider,status:r.status,durationMs:ms,accepted:true,urls,returned:urls.length,distinctUrls:new Set(urls).size,targetFound:rank>0,firstTargetRank:rank||null,reciprocalRank:rank?1/rank:0,...(c.domains?{domainFilterPassed:urls.length>0&&urls.every(raw=>{try{return c.domains.includes(new URL(raw).hostname);}catch{return false;}})}:{})};
  }
  const text=provider==='tinyfish'?data.results?.[0]?.text:data.data?.markdown;
  if(typeof text!=='string')return {provider,status:r.status,durationMs:ms,accepted:true,extracted:false,errorCode:provider==='tinyfish'?data.errors?.[0]?.error||'NO_CONTENT':'NO_CONTENT'};
  const normalized=norm(text);const checks=c.checks.map(alternatives=>({alternatives,passed:alternatives.some(t=>normalized.includes(norm(t)))}));
  if(saveText)writeFileSync(join(dir,'texts',`${c.id}-${provider}.txt`),text);
  return {provider,status:r.status,durationMs:ms,accepted:true,extracted:true,characters:text.length,utf8Bytes:Buffer.byteLength(text),checksPassed:checks.filter(x=>x.passed).length,checksTotal:checks.length,checks,allChecksPassed:checks.every(x=>x.passed),codeFencePairs:Math.floor((text.match(/```/g)||[]).length/2),...(c.id==='raw-markdown'?{codeSyntax:syntax(text)}:{})};
 }catch{return {provider,accepted:false,errorCode:'REQUEST_OR_DECODE_FAILURE',durationMs:Math.round(performance.now()-start)};}
}
function save(){writeFileSync(join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');}
for(const kind of ['extraction','search'])for(const c of manifest[kind]){
 const order=(report[kind].length%2)?['firecrawl','tinyfish']:['tinyfish','firecrawl'];
 const observations=await Promise.all(order.map(p=>call(p,kind==='search'?'search':'scrape',c)));
 const item={...c,observations};report[kind].push(item);save();console.log(JSON.stringify({kind,id:c.id,observations:observations.map(({checks,urls,...rest})=>rest)}));
}
report.finishedAtUtc=new Date().toISOString();save();
