import { ConvexError, v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import schema from "./schema.js";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server.js";
import type { QueryCtx, MutationCtx } from "./_generated/server.js";
import type { Doc } from "./_generated/dataModel.js";
import { internal } from "./_generated/api.js";
import { job, startAgentArgs, ownedJobArgs, jobError, agentStep } from "../job_validators.js";
import { agentRun } from "../agent_validators.js";
import { validateAgent, nonempty, invalid } from "./lib/agent_input.js";
export function terminal(status:string) { return ["COMPLETED","FAILED","CANCELLED"].includes(status); }
async function owned(ctx:QueryCtx|MutationCtx,ownerId:string,jobId:string):Promise<Doc<"jobs">> {
  const id=ctx.db.normalizeId("jobs",jobId); const row=id ? await ctx.db.get(id) : null;
  if(!row || row.ownerId!==ownerId) throw new ConvexError({code:"NOT_FOUND",message:"Agent job not found"});
  return row;
}
function view(row:Doc<"jobs">) {
  return {jobId:row._id,ownerId:row.ownerId,idempotencyKey:row.idempotencyKey,request:row.request,status:row.status,
    runId:row.runId,createdAt:row._creationTime,updatedAt:row.updatedAt,cancelRequested:row.cancelRequested,
    stepsCount:row.stepsCount,lastAction:row.lastAction,streamingUrl:row.streamingUrl,result:row.result,
    resultStored:!!row.resultStorageId,error:row.error,trackingError:row.trackingError,profileAttached:row.profileAttached,profileId:row.profileId};
}
function canonical(value:unknown):string {
  if(Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if(value && typeof value==="object") return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const start = mutation({args:startAgentArgs.fields,returns:v.string(),handler:async(ctx,args)=>{
  nonempty(args.ownerId,"ownerId");nonempty(args.idempotencyKey,"idempotencyKey");validateAgent(args.request);
  const request={...args.request,api_integration:args.request.api_integration??"tinyfish-convex",agent_config:{max_steps:50,max_duration_seconds:600,...args.request.agent_config}};
  const pollIntervalMs=args.pollIntervalMs??5000;
  if(!Number.isSafeInteger(pollIntervalMs)||pollIntervalMs<2000||pollIntervalMs>60000) invalid("pollIntervalMs must be an integer between 2000 and 60000");
  const old=await ctx.db.query("jobs").withIndex("by_owner_key",q=>q.eq("ownerId",args.ownerId).eq("idempotencyKey",args.idempotencyKey)).unique();
  if(old) {
    if(canonical(old.request)!==canonical(request)) throw new ConvexError({code:"IDEMPOTENCY_CONFLICT",message:"This idempotencyKey already belongs to a different request"});
    return old._id;
  }
  const jobId=await ctx.db.insert("jobs",{ownerId:args.ownerId,idempotencyKey:args.idempotencyKey,request,status:"QUEUED",runId:null,updatedAt:Date.now(),cancelRequested:false,
    pollIntervalMs,revision:0,leaseUntil:0,failures:0,stepsCount:0,lastAction:null,streamingUrl:null,result:null,error:null,trackingError:null,profileAttached:null,profileId:null});
  await ctx.scheduler.runAfter(0,internal.agent.dispatch,{jobId});
  await ctx.scheduler.runAfter(60000,internal.jobs.dispatchWatchdog,{jobId,attempt:0});return jobId;
}});
export const get = query({args:ownedJobArgs.fields,returns:job,handler:async(ctx,{ownerId,jobId})=>view(await owned(ctx,ownerId,jobId))});
export const list = query({args:{ownerId:v.string(),paginationOpts:paginationOptsValidator},returns:paginationResultValidator(job),handler:async(ctx,{ownerId,paginationOpts})=>{
  const result=await paginator(ctx.db,schema).query("jobs").withIndex("by_owner",q=>q.eq("ownerId",ownerId)).order("desc").paginate({...paginationOpts,numItems:Math.min(100,paginationOpts.numItems)});
  return {...result,page:result.page.map(view)};
}});
export const steps = query({args:{...ownedJobArgs.fields,paginationOpts:paginationOptsValidator},returns:paginationResultValidator(agentStep),handler:async(ctx,{ownerId,jobId,paginationOpts})=>{
  const row=await owned(ctx,ownerId,jobId);
  const result=await paginator(ctx.db,schema).query("steps").withIndex("by_job_sequence",q=>q.eq("jobId",row._id)).paginate({...paginationOpts,numItems:Math.min(100,paginationOpts.numItems)});
  return {...result,page:result.page.map(({_id,stepId,sequence,timestamp,status,action,duration})=>({id:_id,stepId,sequence,timestamp,status,action,duration}))};
}});
export const cancel = mutation({args:ownedJobArgs.fields,returns:v.null(),handler:async(ctx,{ownerId,jobId})=>{
  const row=await owned(ctx,ownerId,jobId);if(terminal(row.status))return null;
  if(row.status==="QUEUED") {await ctx.db.patch(row._id,{status:"CANCELLED",cancelRequested:true,updatedAt:Date.now()});return null;}
  await ctx.db.patch(row._id,{cancelRequested:true,updatedAt:Date.now()});
  if(row.runId) await ctx.scheduler.runAfter(0,internal.agent.poll,{jobId:row._id});return null;
}});
export const resume = mutation({args:ownedJobArgs.fields,returns:v.null(),handler:async(ctx,{ownerId,jobId})=>{
  const row=await owned(ctx,ownerId,jobId);if(terminal(row.status))return null;
  if(row.status==="QUEUED") {
    await ctx.scheduler.runAfter(0,internal.agent.dispatch,{jobId:row._id});
    await ctx.scheduler.runAfter(60000,internal.jobs.dispatchWatchdog,{jobId:row._id,attempt:0});return null;
  }
  if(!row.runId) throw new ConvexError({code:"SUBMISSION_UNKNOWN",message:"Reconcile this submission with its TinyFish run ID before resuming. A new run will not be submitted automatically."});
  await ctx.db.patch(row._id,{status:"PENDING",failures:0,trackingError:null,updatedAt:Date.now()});
  await ctx.scheduler.runAfter(0,internal.agent.poll,{jobId:row._id});return null;
}});
export const forget = mutation({args:ownedJobArgs.fields,returns:v.null(),handler:async(ctx,{ownerId,jobId})=>{
  const row=await owned(ctx,ownerId,jobId);if(!terminal(row.status)) invalid("Only terminal jobs can be forgotten; cancel an active run first");
  const steps=await ctx.db.query("steps").withIndex("by_job_sequence",q=>q.eq("jobId",row._id)).collect();
  for(const step of steps)await ctx.db.delete(step._id);
  if(row.resultStorageId)await ctx.storage.delete(row.resultStorageId);
  await ctx.db.delete(row._id);return null;
}});
export const load = internalQuery({args:{jobId:v.id("jobs")},handler:(ctx,{jobId}):Promise<Doc<"jobs">|null>=>ctx.db.get(jobId)});
export const loadOwned = internalQuery({args:ownedJobArgs.fields,handler:(ctx,{ownerId,jobId}):Promise<Doc<"jobs">>=>owned(ctx,ownerId,jobId)});
export const dispatchWatchdog = internalMutation({args:{jobId:v.id("jobs"),attempt:v.number()},handler:async(ctx,{jobId,attempt})=>{
  const row=await ctx.db.get(jobId);if(!row||row.status!=="QUEUED")return;
  // A scheduled action can fail before its handler starts. QUEUED proves that
  // the atomic claim has not committed, so no provider POST could have begun.
  if(attempt>=3) {await ctx.db.patch(jobId,{status:"FAILED",updatedAt:Date.now(),error:{code:"DISPATCH_FAILED",message:"Convex could not start the background action after three recovery attempts. No TinyFish run was submitted."}});return;}
  await ctx.scheduler.runAfter(0,internal.agent.dispatch,{jobId});
  await ctx.scheduler.runAfter(60000,internal.jobs.dispatchWatchdog,{jobId,attempt:attempt+1});
}});
export const claimSubmission = internalMutation({args:{jobId:v.id("jobs")},handler:async(ctx,{jobId}):Promise<Doc<"jobs">|null>=>{
  const row=await ctx.db.get(jobId);if(!row||row.status!=="QUEUED")return null;
  await ctx.db.patch(jobId,{status:"SUBMITTING",updatedAt:Date.now()});
  await ctx.scheduler.runAfter(180000,internal.jobs.submissionWatchdog,{jobId});return row;
}});
export const submissionWatchdog = internalMutation({args:{jobId:v.id("jobs")},handler:async(ctx,{jobId})=>{
  const row=await ctx.db.get(jobId);if(row?.status==="SUBMITTING") await ctx.db.patch(jobId,{status:"SUBMISSION_UNKNOWN",updatedAt:Date.now(),trackingError:{code:"SUBMISSION_UNKNOWN",message:"Submission did not return a run ID. Check TinyFish runs and reconcile; resubmitting may create a duplicate charge."}});
}});
export const submitted = internalMutation({args:{jobId:v.id("jobs"),runId:v.string()},handler:async(ctx,{jobId,runId})=>{
  const row=await ctx.db.get(jobId);if(!row||terminal(row.status))return;
  const existing=await ctx.db.query("jobs").withIndex("by_run",q=>q.eq("runId",runId)).unique();
  if(existing&&existing._id!==jobId)invalid("TinyFish run is already tracked by another job");
  await ctx.db.patch(jobId,{runId,status:"PENDING",trackingError:null,updatedAt:Date.now()});
  await ctx.scheduler.runAfter(0,internal.agent.poll,{jobId});
}});
export const submissionFailed = internalMutation({args:{jobId:v.id("jobs"),error:jobError,uncertain:v.boolean()},handler:async(ctx,{jobId,error,uncertain})=>{
  const row=await ctx.db.get(jobId);if(!row||row.runId||terminal(row.status))return;
  await ctx.db.patch(jobId,{status:uncertain?"SUBMISSION_UNKNOWN":"FAILED",error:uncertain?null:error,trackingError:uncertain?error:null,updatedAt:Date.now()});
}});
export const claimPoll = internalMutation({args:{jobId:v.id("jobs")},handler:async(ctx,{jobId}):Promise<Doc<"jobs">|null>=>{
  const row=await ctx.db.get(jobId);if(!row||!row.runId||terminal(row.status)||(row.status==="TRACKING_PAUSED"&&!row.cancelRequested)||row.leaseUntil>Date.now())return null;
  const revision=row.revision+1;
  await ctx.db.patch(jobId,{revision,leaseUntil:Date.now()+330000});
  await ctx.scheduler.runAfter(330000,internal.jobs.pollWatchdog,{jobId,revision});
  return {...row,revision};
}});
export const pollWatchdog = internalMutation({args:{jobId:v.id("jobs"),revision:v.number()},handler:async(ctx,{jobId,revision})=>{
  const row=await ctx.db.get(jobId);if(row&&row.revision===revision&&row.leaseUntil&& !terminal(row.status)) {
    await ctx.db.patch(jobId,{leaseUntil:0});await ctx.scheduler.runAfter(0,internal.agent.poll,{jobId});
  }
}});
export const polled = internalMutation({args:{jobId:v.id("jobs"),revision:v.number(),run:agentRun,resultStorageId:v.optional(v.id("_storage"))},handler:async(ctx,{jobId,revision,run,resultStorageId})=>{
  const row=await ctx.db.get(jobId);
  if(!row||row.revision!==revision||terminal(row.status)) {if(resultStorageId)await ctx.storage.delete(resultStorageId);return;}
  if(row.runId!==run.run_id)invalid("Run ID does not match tracked job");
  if(row.resultStorageId && row.resultStorageId!==resultStorageId)await ctx.storage.delete(row.resultStorageId);
  for(const [sequence,step] of run.steps.entries()) {
    const old=await ctx.db.query("steps").withIndex("by_job_step",q=>q.eq("jobId",jobId).eq("stepId",step.id)).unique();
    const value={jobId,stepId:step.id,sequence,timestamp:step.timestamp,status:step.status,action:step.action?.slice(0,4096)??null,duration:step.duration};
    if(old) {if(canonical({...value})!==canonical({jobId:old.jobId,stepId:old.stepId,sequence:old.sequence,timestamp:old.timestamp,status:old.status,action:old.action,duration:old.duration}))await ctx.db.patch(old._id,value);}
    else await ctx.db.insert("steps",value);
  }
  await ctx.db.patch(jobId,{status:run.status,result:run.result,resultStorageId,
    error:run.error?{code:run.error.code??run.error.category,message:run.error.message.slice(0,2000)}:null,
    profileAttached:run.profile_attached,profileId:run.profile_id,stepsCount:Math.max(run.num_of_steps??0,run.steps.length),lastAction:run.steps.at(-1)?.action?.slice(0,4096)??null,
    streamingUrl:terminal(run.status)?null:run.streaming_url,updatedAt:Date.now(),leaseUntil:0,failures:0,trackingError:null});
  if(!terminal(run.status))await ctx.scheduler.runAfter(row.cancelRequested?0:row.pollIntervalMs,internal.agent.poll,{jobId});
}});
export const pollFailed = internalMutation({args:{jobId:v.id("jobs"),revision:v.number(),error:jobError,retryAfterMs:v.optional(v.number())},handler:async(ctx,{jobId,revision,error,retryAfterMs})=>{
  const row=await ctx.db.get(jobId);if(!row||row.revision!==revision||terminal(row.status))return;
  const failures=row.failures+1; const pause=failures>=8;
  await ctx.db.patch(jobId,{failures,leaseUntil:0,trackingError:error,status:pause?"TRACKING_PAUSED":row.status,updatedAt:Date.now()});
  if(!pause)await ctx.scheduler.runAfter(Math.min(300000,Math.max(row.pollIntervalMs*2**Math.min(failures,5),retryAfterMs??0)),internal.agent.poll,{jobId});
}});
