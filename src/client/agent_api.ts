import { mutationGeneric, queryGeneric, actionGeneric, paginationOptsValidator } from "convex/server";
import type { Auth, GenericDataModel, GenericMutationCtx, MutationBuilder, QueryBuilder, ActionBuilder } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import { v, ConvexError } from "convex/values";
import { agentArgs } from "../agent_validators.js";
import { job } from "../job_validators.js";
import type { AgentArgs } from "../types.js";
import { TinyFish } from "./index.js";
type Operation="start"|"read"|"cancel"|"resume"|"forget"|"result";
/** Mount an authenticated Agent API in the host app without exposing owner IDs. */
export function makeAgentAPI<D extends GenericDataModel = GenericDataModel>(component:ComponentApi,options:{
  authorize:(ctx:{auth:Auth},operation:Operation)=>Promise<string>;
  authorizeRequest?:(ctx:GenericMutationCtx<D>,request:AgentArgs,ownerId:string)=>Promise<void>;
}) {
  const tf=new TinyFish(component);
  const mutation=mutationGeneric as MutationBuilder<D,"public">;
  const query=queryGeneric as QueryBuilder<D,"public">;
  const action=actionGeneric as ActionBuilder<D,"public">;
  const id={jobId:v.string()};
  return {
    start:mutation({args:{request:agentArgs,idempotencyKey:v.string()},returns:v.string(),handler:async(ctx,args):Promise<string>=>{
      const ownerId=await options.authorize(ctx,"start");
      if(options.authorizeRequest)await options.authorizeRequest(ctx,args.request,ownerId);
      else if(args.request.use_profile||args.request.profile_id||args.request.use_vault||args.request.credential_item_ids)throw new ConvexError({code:"RESOURCE_AUTHORIZATION_REQUIRED",message:"Configure authorizeRequest before exposing account Profiles or Vault credentials"});
      return tf.agent.start(ctx,{...args,ownerId});
    }}),
    get:query({args:id,returns:job,handler:async(ctx,args)=>tf.agent.get(ctx,{...args,ownerId:await options.authorize(ctx,"read")})}),
    list:query({args:{paginationOpts:paginationOptsValidator},handler:async(ctx,args)=>tf.agent.list(ctx,{...args,ownerId:await options.authorize(ctx,"read")})}),
    steps:query({args:{...id,paginationOpts:paginationOptsValidator},handler:async(ctx,args)=>tf.agent.steps(ctx,{...args,ownerId:await options.authorize(ctx,"read")})}),
    cancel:mutation({args:id,returns:v.null(),handler:async(ctx,args)=>tf.agent.cancel(ctx,{...args,ownerId:await options.authorize(ctx,"cancel")})}),
    resume:mutation({args:id,returns:v.null(),handler:async(ctx,args)=>tf.agent.resume(ctx,{...args,ownerId:await options.authorize(ctx,"resume")})}),
    forget:mutation({args:id,returns:v.null(),handler:async(ctx,args)=>tf.agent.forget(ctx,{...args,ownerId:await options.authorize(ctx,"forget")})}),
    result:action({args:id,returns:v.any(),handler:async(ctx,args)=>tf.agent.result(ctx,{...args,ownerId:await options.authorize(ctx,"result")})}),
    resultUrl:action({args:id,returns:v.union(v.string(),v.null()),handler:async(ctx,args)=>tf.agent.resultUrl(ctx,{...args,ownerId:await options.authorize(ctx,"result")})}),
  };
}
