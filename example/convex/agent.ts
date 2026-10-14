import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server.js";
import type { MutationCtx, QueryCtx, ActionCtx } from "./_generated/server.js";
import { paginationOptsValidator } from "convex/server";
import { components, internal } from "./_generated/api.js";
import { TinyFish, agentArgs, job, browserArgs, profileCreateArgs, profileSetupArgs, profileSaveArgs } from "tinyfish-convex";
const tf=new TinyFish(components.tinyfish);
async function owner(ctx:MutationCtx|QueryCtx|ActionCtx) {
  const identity=await ctx.auth.getUserIdentity();
  if(!identity)throw new Error("Sign in to use TinyFish");return identity.tokenIdentifier;
}
// These public functions are ready for a hosted app's useMutation/useQuery hooks.
export const start = mutation({args:{idempotencyKey:v.string(),request:agentArgs},returns:v.string(),handler:async(ctx,args):Promise<string>=>{
  const ownerId=await owner(ctx);
  if(args.request.use_vault)throw new Error("Grant Vault credentials on the server before exposing use_vault in a shared-account app");
  if(args.request.use_profile) {
    if(!args.request.profile_id)throw new Error("Select an authorized Profile ID; account defaults are not tenant-specific");
    await ctx.runQuery(internal.resources.assertGrant,{ownerId,kind:"profile",resourceId:args.request.profile_id});
  }
  return tf.agent.start(ctx,{...args,ownerId});
}});
export const get = query({args:{jobId:v.string()},returns:job,handler:async(ctx,args)=>tf.agent.get(ctx,{...args,ownerId:await owner(ctx)})});
export const steps = query({args:{jobId:v.string(),paginationOpts:paginationOptsValidator},handler:async(ctx,args)=>tf.agent.steps(ctx,{...args,ownerId:await owner(ctx)})});
export const cancel = mutation({args:{jobId:v.string()},returns:v.null(),handler:async(ctx,args)=>tf.agent.cancel(ctx,{...args,ownerId:await owner(ctx)})});
export const result = action({args:{jobId:v.string()},handler:async(ctx,args)=>tf.agent.result(ctx,{...args,ownerId:await owner(ctx)})});
// Local bridge and CLI-only acceptance harness. These are never browser-callable.
const demoOwner="local-component-lab";
export const startLocal = internalMutation({args:{idempotencyKey:v.string(),request:agentArgs},handler:(ctx,args)=>tf.agent.start(ctx,{...args,ownerId:demoOwner})});
export const getLocal = internalQuery({args:{jobId:v.string()},returns:job,handler:(ctx,args)=>tf.agent.get(ctx,{...args,ownerId:demoOwner})});
export const cancelLocal = internalMutation({args:{jobId:v.string()},handler:(ctx,args)=>tf.agent.cancel(ctx,{...args,ownerId:demoOwner})});
export const resumeLocal = internalMutation({args:{jobId:v.string()},handler:(ctx,args)=>tf.agent.resume(ctx,{...args,ownerId:demoOwner})});
export const stepsLocal = internalQuery({args:{jobId:v.string()},handler:(ctx,args)=>tf.agent.steps(ctx,{...args,ownerId:demoOwner,paginationOpts:{cursor:null,numItems:100}})});
export const resultLocal = internalAction({args:{jobId:v.string()},handler:(ctx,args)=>tf.agent.result(ctx,{...args,ownerId:demoOwner})});
export const browserCreate = internalAction({args:browserArgs.fields,handler:(ctx,args)=>tf.browser.create(ctx,args)});
export const browserClose = internalAction({args:{sessionId:v.string()},handler:(ctx,args)=>tf.browser.close(ctx,args)});
export const profileCreate = internalAction({args:profileCreateArgs.fields,handler:(ctx,args)=>tf.profiles.create(ctx,args)});
export const profileGet = internalAction({args:{profileId:v.string()},handler:(ctx,args)=>tf.profiles.get(ctx,args)});
export const profileList = internalAction({args:{},handler:ctx=>tf.profiles.list(ctx)});
export const profileRemove = internalAction({args:{profileId:v.string()},handler:(ctx,args)=>tf.profiles.remove(ctx,args)});
export const profileStartSetup = internalAction({args:{profileId:v.string(),...profileSetupArgs.fields},handler:(ctx,args)=>tf.profiles.startSetup(ctx,args)});
export const profileSaveSetup = internalAction({args:{profileId:v.string(),...profileSaveArgs.fields},handler:(ctx,args)=>tf.profiles.saveSetup(ctx,args)});
export const profileCancelSetup = internalAction({args:{profileId:v.string(),session_id:v.string()},handler:(ctx,args)=>tf.profiles.cancelSetup(ctx,args)});
