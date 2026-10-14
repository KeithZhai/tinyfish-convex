import { useEffect, useRef, useState } from "react";
import type { AgentJob, AgentArgs, BrowserSession, ProfileSetup } from "tinyfish-convex";
async function call<T>(operation:string,args:unknown):Promise<T> {
  const response=await fetch(`/api/local/${operation}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(args)});
  const data=await response.json();if(!response.ok)throw new Error(data.message??"Request failed");return data;
}
const finished=(status:string)=>["COMPLETED","FAILED","CANCELLED"].includes(status);
function savedJob(){try{return localStorage.getItem("tinyfish-lab-job")??"";}catch{return "";}}
function httpsUrl(value:unknown){try{if(typeof value!=="string")return null;const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:null;}catch{return null;}}
function download(value:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="tinyfish-agent-result.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function AgentLab({connected}:{connected:boolean}) {
  const [url,setUrl]=useState("https://quotes.toscrape.com");
  const [goal,setGoal]=useState("Click Next to open page 2 and wait for navigation to finish. Then extract the first quote and its author FROM PAGE 2, not from the starting page. Return url, quote and author. Do not create an account or submit any forms.");
  const [profileId,setProfileId]=useState("");
  const [jobId,setJobId]=useState(savedJob);
  const [job,setJob]=useState<AgentJob|null>(null);
  const [events,setEvents]=useState<string[]>([]);
  const [transport,setTransport]=useState("Connecting…");
  const [busy,setBusy]=useState("");const [error,setError]=useState("");
  const [browser,setBrowser]=useState<BrowserSession|null>(null);
  const [setup,setSetup]=useState<ProfileSetup|null>(null);
  const [profileName,setProfileName]=useState("Convex workspace");
  const [profileMessage,setProfileMessage]=useState("");
  const startKey=useRef<{signature:string;key:string}|null>(null);
  useEffect(()=>{
    if(!connected||!jobId)return;
    try{localStorage.setItem("tinyfish-lab-job",jobId);}catch{/* Restricted browsers can still watch this page's job. */}
    const stream=new EventSource(`/api/local/agent-events?jobId=${encodeURIComponent(jobId)}`);
    stream.onmessage=e=>{
      try {const value=JSON.parse(e.data) as AgentJob;setJob(value);setTransport("Subscribed to Convex");
        if(value.lastAction)setEvents(old=>old.at(-1)===value.lastAction?old:[...old,value.lastAction!].slice(-12));
      }catch{setError("Unable to decode the job update");}
    };
    stream.onerror=()=>setTransport("Reconnecting to Convex…");return()=>stream.close();
  },[connected,jobId]);
  async function perform(name:string,operation:()=>Promise<void>) {
    setBusy(name);setError("");try{await operation();}catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy("");}
  }
  const active=!!jobId && (!job||!finished(job.status));
  const enabled=connected&&!busy;
  const previewUrl=httpsUrl(job?.streamingUrl);
  const structured=job?.result&&typeof job.result==="object"&&!Array.isArray(job.result)?job.result:null;
  const sourceUrl=httpsUrl(structured?.url);
  async function start() {
    const request:AgentArgs={url:url.trim(),goal:goal.trim(),agent_config:{max_steps:15,max_duration_seconds:180},
      output_schema:{type:"object",properties:{url:{type:"string"},quote:{type:"string"},author:{type:"string"}},required:["url","quote","author"]},
      ...(profileId.trim()?{use_profile:true,profile_id:profileId.trim()}:{})};
    const signature=JSON.stringify(request);
    if(startKey.current?.signature!==signature)startKey.current={signature,key:crypto.randomUUID()};
    const id=await call<string>("agent-start",{request,idempotencyKey:startKey.current.key});
    setJob(null);setEvents([]);setJobId(id);startKey.current=null;
  }
  return <section className="agent-lab">
    <div className="lab-heading"><h2>Go beyond reading <span>↗</span></h2><span className="tag">BROWSER / WEB AGENT / PROFILE</span></div>
    <p className="mode-note">Start a task, leave the page, come back to its result. Progress is stored in Convex and delivered through a query subscription.</p>
    {!connected&&<div className="setup-note">Start the local Convex demo to use these real capabilities.</div>}
    {error&&<div role="alert" className="alert">{error}</div>}
    <div className="agent-grid"><section className="agent-card">
      <div className="panel-heading"><span className="step">03</span><h3>Act on the web</h3><span className="tag">WEB AGENT</span></div>
      <label>Starting URL<input value={url} disabled={active||!!busy} onChange={e=>setUrl(e.target.value)} /></label>
      <label>What should the agent do?<textarea rows={4} value={goal} disabled={active||!!busy} onChange={e=>setGoal(e.target.value)} /></label>
      <label>Saved Profile ID <span className="optional">optional</span><input placeholder="prof_…" value={profileId} disabled={active||!!busy} onChange={e=>setProfileId(e.target.value)} /></label>
      <div className="agent-actions"><button disabled={!enabled||active||!url.trim()||!goal.trim()} onClick={()=>perform("Starting…",start)}>{busy==="Starting…"?busy:"Start agent →"}</button>
        {active&&<button className="secondary" disabled={!enabled||job?.cancelRequested} onClick={()=>perform("Cancelling…",async()=>{await call("agent-cancel",{jobId});})}>{job?.cancelRequested?"Cancellation requested":"Cancel task"}</button>}
        {job?.status==="TRACKING_PAUSED"&&<button className="secondary" disabled={!enabled} onClick={()=>perform("Resuming…",async()=>{await call("agent-resume",{jobId});})}>Resume tracking</button>}
      </div>
      <p className="resource-note">Demo budget: 15 steps / 180 seconds. Output: URL, quote, author. A Profile ID opts this run into saved browser state.</p>
      {jobId&&<div className="job-output"><div className="job-state" role="status"><strong>{job?.status??"LOADING TASK"}</strong><span>{job?.stepsCount??0} steps · {transport}</span></div><code className="job-id">{jobId}</code>
        {events.length>0&&<ol className="agent-events">{events.map((action,i)=><li key={`${i}:${action}`}>{action}</li>)}</ol>}
        {job?.trackingError&&<div className="partial-error"><strong>{job.trackingError.code}</strong><p>{job.trackingError.message}</p></div>}
        {job?.error&&<div className="partial-error"><strong>{job.error.code}</strong><p>{job.error.message}</p></div>}
        {job?.profileAttached!==null&&job?.profileAttached!==undefined&&<p className="resource-note">{job.profileAttached?`Saved Profile attached: ${job.profileId}`:"No saved Profile attached to this run."}</p>}
        {previewUrl&&<div className="live-preview"><strong>Live browser · view only</strong><iframe src={previewUrl} title="TinyFish agent live browser" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" /><a href={previewUrl} target="_blank" rel="noreferrer">Open preview ↗</a></div>}
        {job?.result!==null&&job?.result!==undefined&&<><div className="result-preview">{typeof structured?.author==="string"&&<strong>{structured.author}</strong>}{sourceUrl&&<a href={sourceUrl} target="_blank" rel="noreferrer">{sourceUrl}</a>}{typeof structured?.quote==="string"&&<p>{structured.quote.split(/\s+/).slice(0,20).join(" ")}{structured.quote.split(/\s+/).length>20?"…":""}</p>}<details><summary>View full JSON result</summary><pre className="agent-result">{JSON.stringify(job.result,null,2)}</pre></details></div><button className="secondary" onClick={()=>download(job.result)}>Download result</button></>}
        {job?.resultStored&&<button className="secondary" disabled={!enabled} onClick={()=>perform("Loading result…",async()=>download(await call("agent-result",{jobId})))}>Download stored result</button>}
        {job?.runId&&<a className="source-url" href={`https://agent.tinyfish.ai/runs/${encodeURIComponent(job.runId)}`} target="_blank" rel="noreferrer">Inspect this run ↗</a>}
      </div>}
    </section><section className="agent-card">
      <div className="panel-heading"><span className="step">04</span><h3>Manage browser state</h3><span className="tag">BROWSER + PROFILE</span></div>
      <p>Create an isolated browser for your CDP tools, or set up a Profile whose saved state can be reused by the agent.</p>
      <div className="resource-group"><h4>Isolated browser</h4><div className="agent-actions"><button className="secondary" disabled={!enabled||!!browser} onClick={()=>perform("Opening browser…",async()=>setBrowser(await call("browser-create",{url:url.trim(),timeout_seconds:300})))}>Open browser</button>
        {browser&&<button className="secondary" disabled={!enabled} onClick={()=>perform("Closing browser…",async()=>{await call("browser-close",{sessionId:browser.session_id});setBrowser(null);})}>Close browser</button>}</div>
        {browser&&<div className="connection"><code>{browser.session_id}</code><button className="secondary" onClick={()=>perform("Copying…",async()=>{await navigator.clipboard.writeText(browser.cdp_url);setProfileMessage("CDP URL copied. Connect using Playwright connectOverCDP.");})}>Copy CDP connection</button></div>}
        <p className="resource-note">Browser sessions expire after inactivity. Close them when finished. CDP connections stay in page memory.</p>
      </div>
      <div className="resource-group"><h4>Reusable Profile</h4><label>Profile name<input value={profileName} onChange={e=>setProfileName(e.target.value)} /></label>
        <div className="agent-actions"><button className="secondary" disabled={!enabled||!profileName.trim()} onClick={()=>perform("Creating profile…",async()=>{const value=await call<{id:string}>("profile-create",{name:profileName.trim()});setProfileId(value.id);setProfileMessage("Profile created. Set it up before relying on signed-in state.");})}>Create profile</button>
          <button className="secondary" disabled={!enabled||!profileId.trim()||!!setup} onClick={()=>perform("Starting setup…",async()=>{setSetup(await call("profile-setup",{profileId:profileId.trim(),url:url.trim(),timeout_seconds:300}));setProfileMessage("Setup browser ready. Connect with your CDP tool, sign in, then save.");})}>Start setup</button></div>
        {setup&&<><p className="resource-note">Setup expires {new Date(setup.expires_at).toLocaleTimeString()}.</p><div className="agent-actions"><button className="secondary" onClick={()=>perform("Copying…",async()=>{await navigator.clipboard.writeText(setup.cdp_url);setProfileMessage("Setup CDP connection copied.");})}>Copy setup connection</button><button disabled={!enabled} onClick={()=>perform("Saving profile…",async()=>{const value=await call<{cookie_count:number;domains_updated:string[];domains_failed:string[]}>("profile-save",{profileId:profileId.trim(),session_id:setup.session_id});setSetup(null);setProfileMessage(`Saved ${value.cookie_count} cookies for ${value.domains_updated.length} domains. ${value.domains_failed.length} domains failed.`);})}>Save state</button><button className="secondary" disabled={!enabled} onClick={()=>perform("Discarding setup…",async()=>{await call("profile-cancel",{profileId:profileId.trim(),session_id:setup.session_id});setSetup(null);setProfileMessage("Unsaved setup state discarded.");})}>Discard</button></div></>}
        <p className="resource-note">Profiles are owned by the API account. In a hosted app, authorize each user’s Profile ID and browser session on the server.</p>
        {profileMessage&&<p className="profile-message" role="status">{profileMessage}</p>}
      </div>
      <div className="native-recipe"><strong>Native Convex integration</strong><pre>{'const jobId = await tf.agent.start(ctx, {\n  ownerId: identity.tokenIdentifier,\n  idempotencyKey, request\n});\n\n// React subscribes to your authenticated query\nconst job = useQuery(api.agent.get, { jobId });'}</pre></div>
    </section></div>
  </section>;
}
