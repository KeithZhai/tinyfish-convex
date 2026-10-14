import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../src/component/schema.js";
import { api, internal } from "../src/component/_generated/api.js";
import type { AgentRun } from "../src/types.js";
const http=vi.fn<typeof fetch>();
const request={url:"https://example.com",goal:"Read the title"};
const args={ownerId:"alice",idempotencyKey:"one",request};
const step={id:"step-1",timestamp:"2026-10-14T00:00:00Z",status:"COMPLETED" as const,action:"Read the title",screenshot:null,html:null,duration:"1s"};
function run(status:AgentRun["status"]="COMPLETED",extra:Partial<AgentRun>={}):AgentRun {return {run_id:"run-1",status,goal:request.goal,created_at:"2026-10-14T00:00:00Z",started_at:null,finished_at:null,num_of_steps:1,result:status==="COMPLETED"?{title:"Example Domain"}:null,output_schema:null,profile_attached:false,profile_id:null,error:null,streaming_url:null,browser_config:null,video_url:null,steps:[step],...extra};}
const json=(data:unknown,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers});
const setup=()=>convexTest(schema,import.meta.glob("../src/component/**/*.ts"));
beforeEach(()=>{vi.useFakeTimers();vi.stubEnv("TINYFISH_API_KEY","test-key");vi.stubGlobal("fetch",http);http.mockReset();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("durable Agent jobs",()=>{
  it("atomically deduplicates host mutations and rejects changed requests",async()=>{
    const t=setup();const id=await t.mutation(api.jobs.start,args);
    expect(await t.mutation(api.jobs.start,{...args,request:{goal:request.goal,url:request.url}})).toBe(id);
    await expect(t.mutation(api.jobs.start,{...args,request:{...request,goal:"Different goal"}})).rejects.toThrow("different request");
    expect(http).not.toHaveBeenCalled();
  });
  it("validates budget and profile options before enqueueing a paid call",async()=>{
    const t=setup();
    for(const invalid of [{agent_config:{max_steps:0}},{agent_config:{max_steps:1.5}},{profile_id:"prof-other"},{credential_item_ids:["cred-1"]},{goal:" "},{url:"https://user:pass@example.com"}])await expect(t.mutation(api.jobs.start,{...args,request:{...request,...invalid}})).rejects.toThrow();
    expect(http).not.toHaveBeenCalled();
  });
  it("isolates every job and its steps from another owner",async()=>{
    const t=setup();const id=await t.mutation(api.jobs.start,args);
    await expect(t.query(api.jobs.get,{ownerId:"bob",jobId:id})).rejects.toThrow("not found");
    await expect(t.query(api.jobs.steps,{ownerId:"bob",jobId:id,paginationOpts:{cursor:null,numItems:10}})).rejects.toThrow("not found");
    await expect(t.mutation(api.jobs.cancel,{ownerId:"bob",jobId:id})).rejects.toThrow("not found");
    await expect(t.action(api.agent.result,{ownerId:"bob",jobId:id})).rejects.toThrow("not found");
  });
  it("cancels before dispatch with zero upstream calls",async()=>{
    const t=setup();const id=await t.mutation(api.jobs.start,args);
    await t.mutation(api.jobs.cancel,{ownerId:"alice",jobId:id});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("CANCELLED");expect(http).not.toHaveBeenCalled();
  });
  it("tracks real async contracts, steps and completion durably",async()=>{
    http.mockResolvedValueOnce(json({run_id:"run-1",error:null})).mockResolvedValueOnce(json(run("RUNNING"))).mockResolvedValueOnce(json(run()));
    const t=setup();const id=await t.mutation(api.jobs.start,args);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).toMatchObject({status:"COMPLETED",runId:"run-1",stepsCount:1,result:{title:"Example Domain"},trackingError:null});
    expect((await t.query(api.jobs.steps,{ownerId:"alice",jobId:id,paginationOpts:{cursor:null,numItems:10}})).page).toHaveLength(1);
    const body=JSON.parse(String(http.mock.calls[0][1]?.body));
    expect(body.agent_config).toEqual({max_steps:50,max_duration_seconds:600});
    expect(String(http.mock.calls[1][0])).toContain("screenshots=none&html=none");expect(http).toHaveBeenCalledTimes(3);
  });
  it("leaves an uncertain POST explicit without automatic resubmission",async()=>{
    http.mockRejectedValue(new Error("lost network"));const t=setup();const id=await t.mutation(api.jobs.start,args);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("SUBMISSION_UNKNOWN");expect(http).toHaveBeenCalledTimes(1);
    await expect(t.mutation(api.jobs.resume,{ownerId:"alice",jobId:id})).rejects.toThrow("Reconcile");
  });
  it("recovers a scheduled dispatch that failed before its handler began",async()=>{
    const t=setup();const id=await t.mutation(api.jobs.start,args);
    await t.run(async(ctx)=>{const functions=await ctx.db.system.query("_scheduled_functions").collect();const dispatch=functions.find(f=>f.name.includes("agent")&&f.name.includes("dispatch"));expect(dispatch).toBeDefined();await ctx.scheduler.cancel(dispatch!._id);});
    http.mockResolvedValueOnce(json({run_id:"run-1",error:null})).mockResolvedValueOnce(json(run()));
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("COMPLETED");
    expect(http.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(1);
  });
  it("marks a stalled submission uncertain and accepts its late successful response",async()=>{
    const t=setup();const id=await t.mutation(api.jobs.start,args);
    await t.mutation(internal.jobs.claimSubmission,{jobId:id});await t.mutation(internal.jobs.submissionWatchdog,{jobId:id});
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("SUBMISSION_UNKNOWN");
    await t.mutation(internal.jobs.submitted,{jobId:id,runId:"run-1"});
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).runId).toBe("run-1");
  });
  it("uses API-verified reconciliation and rejects a different goal",async()=>{
    const t=setup();const id=await t.mutation(api.jobs.start,args);
    await t.mutation(internal.jobs.claimSubmission,{jobId:id});await t.mutation(internal.jobs.submissionWatchdog,{jobId:id});
    http.mockResolvedValueOnce(json(run("COMPLETED",{goal:"Someone else's goal"})));
    await expect(t.action(api.agent.reconcile,{ownerId:"alice",jobId:id,runId:"run-1"})).rejects.toThrow("does not match");
    http.mockResolvedValueOnce(json(run()));await t.action(api.agent.reconcile,{ownerId:"alice",jobId:id,runId:"run-1"});
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("PENDING");
  });
  it("does not overwrite terminal results with late polling responses",async()=>{
    const t=setup();const id=await t.mutation(api.jobs.start,args);await t.mutation(internal.jobs.claimSubmission,{jobId:id});await t.mutation(internal.jobs.submitted,{jobId:id,runId:"run-1"});
    const row=await t.mutation(internal.jobs.claimPoll,{jobId:id});
    await t.mutation(internal.jobs.polled,{jobId:id,revision:row!.revision,run:run()});
    await t.mutation(internal.jobs.polled,{jobId:id,revision:row!.revision,run:run("RUNNING")});
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("COMPLETED");
  });
  it("waits for cancellation acknowledgement and preserves a concurrent completion",async()=>{
    const t=setup();const id=await t.mutation(api.jobs.start,args);await t.mutation(internal.jobs.claimSubmission,{jobId:id});await t.mutation(internal.jobs.submitted,{jobId:id,runId:"run-1"});
    await t.mutation(api.jobs.cancel,{ownerId:"alice",jobId:id});
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("PENDING");
    http.mockResolvedValueOnce(json({run_id:"run-1",status:"COMPLETED",cancelled_at:null,message:"Already finished"})).mockResolvedValueOnce(json(run()));
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("COMPLETED");expect(String(http.mock.calls[0][0])).toMatch(/\/cancel$/);
  });
  it("retries reads without restarting a paid job and pauses after bounded failures",async()=>{
    http.mockResolvedValueOnce(json({run_id:"run-1",error:null})).mockImplementation(async()=>json({error:{code:"SERVICE_BUSY"}},503,{"Retry-After":"2"}));
    const t=setup();const id=await t.mutation(api.jobs.start,args);await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("TRACKING_PAUSED");
    expect(http.mock.calls.filter(([,i])=>i?.method==="POST")).toHaveLength(1);
    http.mockResolvedValue(json(run()));await t.mutation(api.jobs.resume,{ownerId:"alice",jobId:id});await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).status).toBe("COMPLETED");
  });
  it("stores large results outside the reactive document and cleans them on forget",async()=>{
    const large={text:"x".repeat(160000)};
    http.mockResolvedValueOnce(json({run_id:"run-1",error:null})).mockResolvedValueOnce(json(run("COMPLETED",{result:large})));
    const t=setup();const id=await t.mutation(api.jobs.start,args);await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.jobs.get,{ownerId:"alice",jobId:id})).toMatchObject({result:null,resultStored:true});
    expect(await t.action(api.agent.result,{ownerId:"alice",jobId:id})).toEqual(large);
    await t.mutation(api.jobs.forget,{ownerId:"alice",jobId:id});await expect(t.query(api.jobs.get,{ownerId:"alice",jobId:id})).rejects.toThrow("not found");
  });
});
describe("Browser and Profile actions",()=>{
  it("returns a CDP capability and supports a 204 termination response",async()=>{
    const t=setup();http.mockResolvedValueOnce(json({session_id:"br-1",cdp_url:"wss://remote.test/cdp",base_url:"https://remote.test"})).mockResolvedValueOnce(new Response(null,{status:204}));
    expect(await t.action(api.browser.create,{url:"https://example.com",timeout_seconds:60})).toMatchObject({session_id:"br-1"});
    expect(await t.action(api.browser.close,{sessionId:"br-1"})).toBeNull();expect(http.mock.calls[1][1]?.method).toBe("DELETE");
  });
  it("checks profile names and session timeouts before creating resources",async()=>{
    const t=setup();await expect(t.action(api.profiles.create,{name:" "})).rejects.toThrow();await expect(t.action(api.browser.create,{timeout_seconds:1})).rejects.toThrow();expect(http).not.toHaveBeenCalled();
  });
  it("encodes resource identifiers and keeps setup state out of the database",async()=>{
    const t=setup();http.mockResolvedValueOnce(json({session_id:"br-1",cdp_url:"wss://remote.test/cdp",base_url:"https://remote.test",timeout_seconds:300,expires_at:"2026-10-14T00:05:00Z"})).mockResolvedValueOnce(json({cancelled:true}));
    expect(await t.action(api.profiles.startSetup,{profileId:"prof/name",url:"https://example.com"})).toMatchObject({session_id:"br-1"});
    expect(String(http.mock.calls[0][0])).toContain("prof%2Fname/setup-session");
    await t.action(api.profiles.cancelSetup,{profileId:"prof/name",session_id:"br-1"});
    expect(await t.run(ctx=>ctx.db.query("jobs").collect())).toEqual([]);
  });
});
