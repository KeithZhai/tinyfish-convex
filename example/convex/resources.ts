import { v, ConvexError } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server.js";
import { components, internal } from "./_generated/api.js";
import { TinyFish, browserArgs, profileCreateArgs, profileSetupArgs, profileSaveArgs } from "tinyfish-convex";
import type { Profile, ProfileDetails, ProfileSetup, ProfileSaved, BrowserSession } from "tinyfish-convex";
import type { ActionCtx } from "./_generated/server.js";
const tf=new TinyFish(components.tinyfish);
const kind=v.union(v.literal("profile"),v.literal("browser"),v.literal("setup"));
async function owner(ctx:ActionCtx):Promise<string> {const identity=await ctx.auth.getUserIdentity();if(!identity)throw new Error("Sign in to use TinyFish");return identity.tokenIdentifier;}
export const assertGrant=internalQuery({args:{ownerId:v.string(),resourceId:v.string(),kind,profileId:v.optional(v.string())},returns:v.null(),handler:async(ctx,args):Promise<null>=>{
  const grant=await ctx.db.query("resourceGrants").withIndex("by_resource",q=>q.eq("kind",args.kind).eq("resourceId",args.resourceId)).unique();
  if(!grant||grant.ownerId!==args.ownerId||(args.profileId!==undefined&&grant.profileId!==args.profileId))throw new ConvexError({code:"NOT_FOUND",message:"TinyFish resource not found"});return null;
}});
export const remember=internalMutation({args:{ownerId:v.string(),resourceId:v.string(),kind,profileId:v.optional(v.string())},returns:v.null(),handler:async(ctx,args):Promise<null>=>{await ctx.db.insert("resourceGrants",args);return null;}});
export const forget=internalMutation({args:{ownerId:v.string(),resourceId:v.string(),kind},returns:v.null(),handler:async(ctx,args):Promise<null>=>{
  const grant=await ctx.db.query("resourceGrants").withIndex("by_resource",q=>q.eq("kind",args.kind).eq("resourceId",args.resourceId)).unique();
  if(grant?.ownerId===args.ownerId)await ctx.db.delete(grant._id);return null;
}});
export const createProfile=action({args:profileCreateArgs.fields,handler:async(ctx,args):Promise<Profile>=>{
  const ownerId=await owner(ctx);const profile=await tf.profiles.create(ctx,{...args,set_as_default:false});
  try{await ctx.runMutation(internal.resources.remember,{ownerId,kind:"profile",resourceId:profile.id});}catch(e){await tf.profiles.remove(ctx,{profileId:profile.id});throw e;}return profile;
}});
export const getProfile=action({args:{profileId:v.string()},handler:async(ctx,{profileId}):Promise<ProfileDetails>=>{
  await ctx.runQuery(internal.resources.assertGrant,{ownerId:await owner(ctx),kind:"profile",resourceId:profileId});return tf.profiles.get(ctx,{profileId});
}});
export const startSetup=action({args:{profileId:v.string(),...profileSetupArgs.fields},handler:async(ctx,args):Promise<ProfileSetup>=>{
  const ownerId=await owner(ctx);await ctx.runQuery(internal.resources.assertGrant,{ownerId,kind:"profile",resourceId:args.profileId});
  const session=await tf.profiles.startSetup(ctx,args);
  try{await ctx.runMutation(internal.resources.remember,{ownerId,kind:"setup",resourceId:session.session_id,profileId:args.profileId});}catch(e){await tf.profiles.cancelSetup(ctx,{profileId:args.profileId,session_id:session.session_id});throw e;}return session;
}});
export const saveSetup=action({args:{profileId:v.string(),...profileSaveArgs.fields},handler:async(ctx,args):Promise<ProfileSaved>=>{
  const ownerId=await owner(ctx);await ctx.runQuery(internal.resources.assertGrant,{ownerId,kind:"setup",resourceId:args.session_id,profileId:args.profileId});
  const saved=await tf.profiles.saveSetup(ctx,args);await ctx.runMutation(internal.resources.forget,{ownerId,kind:"setup",resourceId:args.session_id});return saved;
}});
export const cancelSetup=action({args:{profileId:v.string(),session_id:v.string()},handler:async(ctx,args):Promise<null>=>{
  const ownerId=await owner(ctx);await ctx.runQuery(internal.resources.assertGrant,{ownerId,kind:"setup",resourceId:args.session_id,profileId:args.profileId});
  await tf.profiles.cancelSetup(ctx,args);await ctx.runMutation(internal.resources.forget,{ownerId,kind:"setup",resourceId:args.session_id});return null;
}});
export const createBrowser=action({args:browserArgs.fields,handler:async(ctx,args):Promise<BrowserSession>=>{
  const ownerId=await owner(ctx);const session=await tf.browser.create(ctx,{timeout_seconds:300,...args});
  try{await ctx.runMutation(internal.resources.remember,{ownerId,kind:"browser",resourceId:session.session_id});}catch(e){await tf.browser.close(ctx,{sessionId:session.session_id});throw e;}return session;
}});
export const closeBrowser=action({args:{sessionId:v.string()},handler:async(ctx,{sessionId}):Promise<null>=>{
  const ownerId=await owner(ctx);await ctx.runQuery(internal.resources.assertGrant,{ownerId,kind:"browser",resourceId:sessionId});
  await tf.browser.close(ctx,{sessionId});await ctx.runMutation(internal.resources.forget,{ownerId,kind:"browser",resourceId:sessionId});return null;
}});
