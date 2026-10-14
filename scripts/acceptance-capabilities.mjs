import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const cwd=new URL('../',import.meta.url).pathname;
const directory=new URL('../.capability-results/',import.meta.url);mkdirSync(directory,{recursive:true});
const report={version:'0.2.0',testedAt:new Date().toISOString(),checks:[],cleanup:[]};
let standalone,profile,setup;let expectedQuote,expectedAuthor;const connections=[];
function invoke(fn,args={}) {try{const output=execFileSync('npx',['convex','run',`agent:${fn}`,JSON.stringify(args)],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:165000});return output.trim()?JSON.parse(output):null;}catch(e){throw new Error(`${fn} failed (${e.status??'timeout'}). Inspect sanitized backend errors.`);}}
function check(name,value={}){report.checks.push({name,passed:true,...value});writeFileSync(new URL('report.json',directory),JSON.stringify(report,null,2));console.log('PASS',name);}
try {
 standalone=invoke('browserCreate',{url:'https://quotes.toscrape.com',timeout_seconds:120,proxy_config:{enabled:false}});
 const browser=await chromium.connectOverCDP(standalone.cdp_url,{timeout:60000});
 connections.push(browser);const page=browser.contexts()[0].pages()[0]??await browser.newPage();await page.goto('https://quotes.toscrape.com',{timeout:60000});
 assert.match(await page.title(),/Quotes/);await page.locator('.pager .next a').click();await page.waitForURL('**/page/2/');expectedQuote=await page.locator('.quote .text').first().innerText();expectedAuthor=await page.locator('.quote .author').first().innerText();assert.ok(expectedQuote);
 check('Browser CDP: navigate and click pagination',{sessionCreated:true,page2:true});
 await browser.close();invoke('browserClose',{sessionId:standalone.session_id});invoke('browserClose',{sessionId:standalone.session_id});standalone=null;
 check('Browser termination is idempotent');
 profile=invoke('profileCreate',{name:`Convex verification ${Date.now()}`,set_as_default:false});check('Create isolated non-default Profile');
 setup=invoke('profileStartSetup',{profileId:profile.id,url:'https://quotes.toscrape.com/login',timeout_seconds:300});
 const loggedInBrowser=await chromium.connectOverCDP(setup.cdp_url,{timeout:60000});
 connections.push(loggedInBrowser);const login=loggedInBrowser.contexts()[0].pages()[0]??await loggedInBrowser.newPage();await login.goto('https://quotes.toscrape.com/login',{timeout:60000});
 await login.locator('#username').fill('convex-integration-test');await login.locator('#password').fill('synthetic-public-sandbox-password');await login.locator('input[type=submit]').click();await login.getByText('Logout',{exact:true}).waitFor({timeout:20000});
 const saved=invoke('profileSaveSetup',{profileId:profile.id,session_id:setup.session_id});setup=null;
 assert.ok(saved.cookie_count>0);assert.ok(saved.domains_updated.some(d=>d.endsWith('toscrape.com')));check('Profile setup: log in to public sandbox and save state',{cookieCount:saved.cookie_count,domains:saved.domains_updated});
 await loggedInBrowser.close().catch(()=>{});
 const details=invoke('profileGet',{profileId:profile.id});assert.ok(details.domains.some(d=>d.domain.endsWith('toscrape.com')));check('Profile metadata reflects saved domain');
 const request={url:'https://quotes.toscrape.com',goal:'First click Next to navigate to page 2. Wait for navigation to finish and confirm the content has changed. ONLY THEN extract the first quote and its author from PAGE 2 (not the starting page). Check if Logout is visible on page 2. Return signedIn, pageUrl, firstQuote, author. Do not submit forms or log out.',use_profile:true,profile_id:profile.id,agent_config:{max_steps:15,max_duration_seconds:180},output_schema:{type:'object',properties:{signedIn:{type:'boolean'},pageUrl:{type:'string'},firstQuote:{type:'string'},author:{type:'string'}},required:['signedIn','pageUrl','firstQuote','author']}};
 const idempotencyKey=`full-verification-${Date.now()}`;
 const jobId=invoke('startLocal',{idempotencyKey,request});assert.equal(invoke('startLocal',{idempotencyKey,request}),jobId);check('Agent start mutation returns same job for a duplicate submission');
 let job;const states=new Set();const deadline=Date.now()+240000;
 do {job=invoke('getLocal',{jobId});states.add(job.status);if(['COMPLETED','FAILED','CANCELLED','TRACKING_PAUSED','SUBMISSION_UNKNOWN'].includes(job.status))break;await new Promise(r=>setTimeout(r,5000));}while(Date.now()<deadline);
 assert.equal(job.status,'COMPLETED',`Run ended ${job.status}: ${job.error?.code??job.trackingError?.code??''}`);
 assert.equal(job.profileAttached,true);assert.equal(job.profileId,profile.id);
 const result=invoke('resultLocal',{jobId});assert.equal(result.signedIn,true);assert.match(result.pageUrl,/\/page\/2\/?/);const normalize=s=>s.trim().replace(/^[“"]|[”"]$/g,'');assert.equal(normalize(result.firstQuote),normalize(expectedQuote));assert.equal(result.author,expectedAuthor);
 check('Durable Agent uses saved authenticated state and completes interactive extraction',{jobId,status:job.status,profileAttached:job.profileAttached,observedStates:[...states],resultChecks:{signedIn:result.signedIn,pageUrl:result.pageUrl,author:result.author,quoteMatchesGroundTruth:true},stepsCount:job.stepsCount});
 const steps=invoke('stepsLocal',{jobId});assert.ok(steps.page.length>=1);check('Agent steps persist and paginate',{steps:steps.page.length});
 invoke('cancelLocal',{jobId});assert.equal(invoke('getLocal',{jobId}).status,'COMPLETED');check('Cancelling an already completed job preserves its result');
} catch(error) {report.error=error.message;console.log('FAIL',error.message);process.exitCode=1;}
finally {
 await Promise.allSettled(connections.map(browser=>browser.close()));
 for(const [name,operation] of [['profile-setup',()=>setup&&invoke('profileCancelSetup',{profileId:profile.id,session_id:setup.session_id})],['browser',()=>standalone&&invoke('browserClose',{sessionId:standalone.session_id})],['profile',()=>profile&&invoke('profileRemove',{profileId:profile.id})]])try{operation();report.cleanup.push({resource:name,ok:true});}catch{report.cleanup.push({resource:name,ok:false});process.exitCode=1;}
 writeFileSync(new URL('report.json',directory),JSON.stringify(report,null,2));console.log('Report saved; connection URLs and browser credentials omitted.');
}

process.exit(process.exitCode??0);
