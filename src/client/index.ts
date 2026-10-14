import type { GenericActionCtx, GenericMutationCtx, GenericQueryCtx, GenericDataModel, PaginationOptions } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type { SearchArgs, SearchResponse, FetchArgs, FetchResponse, ReadArgs, ResearchArgs, ResearchResponse } from "../types.js";
import { ConvexError } from "convex/values";
import { validateSearch, validateFetchOptions } from "../component/lib/input.js";
export type * from "../types.js";
export { makeAgentAPI } from "./agent_api.js";
export { searchArgs, fetchArgs, searchResponse, fetchResponse } from "../validators.js";
export { readArgs, researchArgs, researchResponse } from "../workflow_validators.js";
export * from "../agent_validators.js";
export { startAgentArgs, ownedJobArgs, job, jobStatus, agentStep } from "../job_validators.js";
type ActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction">;
type MutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type OwnedJob = {ownerId:string;jobId:string};
/** Server-side helper: call from your application's Convex actions. */
export class TinyFish {
  constructor(private readonly component: ComponentApi) {}
  search(ctx: ActionCtx, args: SearchArgs): Promise<SearchResponse> {
    return ctx.runAction(this.component.search.query, args);
  }
  fetch(ctx: ActionCtx, args: FetchArgs): Promise<FetchResponse> {
    return ctx.runAction(this.component.fetch.getContents, args);
  }
  read(ctx: ActionCtx, args: ReadArgs): Promise<FetchResponse> {
    return ctx.runAction(this.component.fetch.read, args);
  }
  async research(ctx: ActionCtx, args: ResearchArgs): Promise<ResearchResponse> {
    const maxSources = args.maxSources ?? 3;
    if (!Number.isSafeInteger(maxSources) || maxSources < 1 || maxSources > 10) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "maxSources must be an integer between 1 and 10" });
    }
    validateSearch(args.search);
    validateFetchOptions(args.read ?? {});
    const sources = await this.search(ctx, args.search);
    const urls = [...new Set(sources.results.map(source => source.url))].slice(0, maxSources);
    if (!urls.length) return { sources, pages: null };
    const pages = await this.read(ctx, {
      links: true,
      ...(args.search.purpose === undefined ? {} : { purpose: args.search.purpose }),
      ...args.read, urls,
    });
    return { sources, pages };
  }
  /** Derive ownerId from host authentication; never accept it from the browser. */
  agent = {
    start: (ctx:MutationCtx,args:import("../types.js").StartAgentArgs) => ctx.runMutation(this.component.jobs.start,args),
    get: (ctx:QueryCtx,args:OwnedJob) => ctx.runQuery(this.component.jobs.get,args),
    list: (ctx:QueryCtx,args:{ownerId:string;paginationOpts:PaginationOptions}) => ctx.runQuery(this.component.jobs.list,args),
    steps: (ctx:QueryCtx,args:OwnedJob & {paginationOpts:PaginationOptions}) => ctx.runQuery(this.component.jobs.steps,args),
    cancel: (ctx:MutationCtx,args:OwnedJob) => ctx.runMutation(this.component.jobs.cancel,args),
    resume: (ctx:MutationCtx,args:OwnedJob) => ctx.runMutation(this.component.jobs.resume,args),
    forget: (ctx:MutationCtx,args:OwnedJob) => ctx.runMutation(this.component.jobs.forget,args),
    reconcile: (ctx:ActionCtx,args:OwnedJob & {runId:string}) => ctx.runAction(this.component.agent.reconcile,args),
    result: (ctx:ActionCtx,args:OwnedJob) => ctx.runAction(this.component.agent.result,args),
    resultUrl: (ctx:ActionCtx,args:OwnedJob) => ctx.runAction(this.component.agent.resultUrl,args),
  };
  /** Session URLs are bearer capabilities. Return them only to their authorized owner. */
  browser = {
    create: (ctx:ActionCtx,args:import("../types.js").BrowserArgs = {}) => ctx.runAction(this.component.browser.create,args),
    close: (ctx:ActionCtx,args:{sessionId:string}) => ctx.runAction(this.component.browser.close,args),
  };
  /** Provider profiles belong to the API account; the host owns tenant grants. */
  profiles = {
    create: (ctx:ActionCtx,args:import("../types.js").ProfileCreateArgs) => ctx.runAction(this.component.profiles.create,args),
    list: (ctx:ActionCtx) => ctx.runAction(this.component.profiles.list,{}),
    get: (ctx:ActionCtx,args:{profileId:string}) => ctx.runAction(this.component.profiles.get,args),
    update: (ctx:ActionCtx,args:import("../types.js").ProfileUpdateArgs & {profileId:string}) => ctx.runAction(this.component.profiles.update,args),
    remove: (ctx:ActionCtx,args:{profileId:string}) => ctx.runAction(this.component.profiles.remove,args),
    startSetup: (ctx:ActionCtx,args:import("../types.js").ProfileSetupArgs & {profileId:string}) => ctx.runAction(this.component.profiles.startSetup,args),
    saveSetup: (ctx:ActionCtx,args:import("../types.js").ProfileSaveArgs & {profileId:string}) => ctx.runAction(this.component.profiles.saveSetup,args),
    cancelSetup: (ctx:ActionCtx,args:{profileId:string;session_id:string}) => ctx.runAction(this.component.profiles.cancelSetup,args),
    removeDomain: (ctx:ActionCtx,args:{profileId:string;domain:string}) => ctx.runAction(this.component.profiles.removeDomain,args),
  };
}
