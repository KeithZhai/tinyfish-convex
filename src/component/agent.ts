import { ConvexError, v } from "convex/values";
import { internalAction, action, env } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { decode } from "./lib/response.js";
import { requestJson } from "./lib/http.js";
import { agentRunShape, agentSubmittedShape, agentCancelledShape } from "./lib/agent_shapes.js";
import { ownedJobArgs } from "../job_validators.js";
import { nonempty, invalid } from "./lib/agent_input.js";
import type { AgentRun } from "../types.js";
const runUrl = (runId:string) => `https://agent.tinyfish.ai/v1/runs/${encodeURIComponent(runId)}`;
async function fetchRun(key:string,runId:string):Promise<AgentRun> {
  const run=decode(await requestJson(`${runUrl(runId)}?screenshots=none&html=none`,key),agentRunShape) as AgentRun;
  if(run.run_id!==runId)invalid("TinyFish returned a different run ID");return run;
}
function failure(error:unknown) {
  if(error instanceof ConvexError && error.data && typeof error.data==="object" && !Array.isArray(error.data)) {
    const data=error.data as Record<string,unknown>;
    return {code:typeof data.code==="string"?data.code:"REQUEST_FAILED",message:typeof data.message==="string"?data.message:"TinyFish request failed",
      ...(typeof data.requestId==="string"?{requestId:data.requestId}:{}),status:typeof data.status==="number"?data.status:null,retryAfter:typeof data.retryAfter==="string"?data.retryAfter:null};
  }
  return {code:"TRACKING_ERROR",message:"Unable to update TinyFish job",status:null,retryAfter:null};
}
export const dispatch = internalAction({args:{jobId:v.id("jobs")},returns:v.null(),handler:async(ctx,{jobId}):Promise<null>=>{
  const row=await ctx.runMutation(internal.jobs.claimSubmission,{jobId});if(!row)return null;
  let runId:string;
  try {
    const response=decode(await requestJson("https://agent.tinyfish.ai/v1/automation/run-async",env.TINYFISH_API_KEY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(row.request)}),agentSubmittedShape) as {run_id:string|null;error:{code:string;message:string}|null};
    if(response.error||!response.run_id)throw new ConvexError({code:response.error?.code??"INVALID_RESPONSE",message:"TinyFish did not accept the run"});
    runId=response.run_id;
  } catch(error) {
    const {status,retryAfter:_,...safe}=failure(error);
    // The async contract has no documented caller idempotency key. Never blindly
    // repeat a POST after timeout/5xx: the provider may already be executing it.
    const uncertain=status===null && !["MISSING_API_KEY","INVALID_INPUT"].includes(safe.code) || status!==null&&status>=500;
    await ctx.runMutation(internal.jobs.submissionFailed,{jobId,error:safe,uncertain});return null;
  }
  await ctx.runMutation(internal.jobs.submitted,{jobId,runId});return null;
}});
export const poll = internalAction({args:{jobId:v.id("jobs")},returns:v.null(),handler:async(ctx,{jobId}):Promise<null>=>{
  const row=await ctx.runMutation(internal.jobs.claimPoll,{jobId});if(!row||!row.runId)return null;
  let resultStorageId;
  try {
    if(row.cancelRequested)decode(await requestJson(`${runUrl(row.runId)}/cancel`,env.TINYFISH_API_KEY,{method:"POST"}),agentCancelledShape);
    const run=await fetchRun(env.TINYFISH_API_KEY,row.runId);
    // Large structured results belong in file storage, keeping reactive status
    // queries small and safely below Convex's per-document size limit.
    if(run.result!==null) {
      const bytes=new TextEncoder().encode(JSON.stringify(run.result));
      if(bytes.length>128000) {resultStorageId=await ctx.storage.store(new Blob([bytes],{type:"application/json"}));run.result=null;}
    }
    await ctx.runMutation(internal.jobs.polled,{jobId,revision:row.revision,run,...(resultStorageId?{resultStorageId}:{})});
  } catch(error) {
    if(resultStorageId)await ctx.storage.delete(resultStorageId);
    const {status:_,retryAfter,...safe}=failure(error);
    const seconds=retryAfter===null?0:Number(retryAfter);
    const retryAfterMs=Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(retryAfter??"")-Date.now());
    await ctx.runMutation(internal.jobs.pollFailed,{jobId,revision:row.revision,error:safe,...(Number.isFinite(retryAfterMs)?{retryAfterMs}:{})});
  }
  return null;
}});
export const reconcile = action({args:{...ownedJobArgs.fields,runId:v.string()},returns:v.null(),handler:async(ctx,{ownerId,jobId,runId}):Promise<null>=>{
  nonempty(runId,"runId");
  const row=await ctx.runQuery(internal.jobs.loadOwned,{ownerId,jobId});
  if(!["SUBMISSION_UNKNOWN","SUBMITTING"].includes(row.status))invalid("Only an uncertain submission can be reconciled");
  const run=await fetchRun(env.TINYFISH_API_KEY,runId);
  if(run.goal!==row.request.goal)invalid("The TinyFish run goal does not match this job");
  await ctx.runMutation(internal.jobs.submitted,{jobId:row._id,runId});return null;
}});
export const result = action({args:ownedJobArgs.fields,returns:v.any(),handler:async(ctx,{ownerId,jobId}):Promise<unknown>=>{
  const row=await ctx.runQuery(internal.jobs.loadOwned,{ownerId,jobId});
  if(!row.resultStorageId)return row.result;
  const blob=await ctx.storage.get(row.resultStorageId);
  if(!blob)throw new ConvexError({code:"RESULT_NOT_FOUND",message:"Stored result no longer exists"});
  if(blob.size>7000000)throw new ConvexError({code:"RESULT_TOO_LARGE",message:"Use resultUrl for results larger than 7 MB"});
  return JSON.parse(await blob.text());
}});
export const resultUrl = action({args:ownedJobArgs.fields,returns:v.union(v.string(),v.null()),handler:async(ctx,{ownerId,jobId}):Promise<string|null>=>{
  const row=await ctx.runQuery(internal.jobs.loadOwned,{ownerId,jobId});
  return row.resultStorageId?ctx.storage.getUrl(row.resultStorageId):null;
}});
