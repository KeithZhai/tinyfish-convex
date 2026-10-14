import { v } from "convex/values";
import { action, env } from "./_generated/server.js";
import * as validators from "../agent_validators.js";
import * as shapes from "./lib/agent_shapes.js";
import { decode } from "./lib/response.js";
import { requestJson } from "./lib/http.js";
import { validateArgs, nonempty } from "./lib/agent_input.js";
import type { Profile, ProfileDetails, ProfilesResponse, ProfileSetup, ProfileSaved } from "../types.js";
const endpoint = (id?:string, suffix="") => {
  if(id !== undefined) nonempty(id,"profileId");
  return `https://agent.tinyfish.ai/v1/profiles${id === undefined ? "" : `/${encodeURIComponent(id)}`}${suffix}`;
};
const json = (method:string, args:unknown):RequestInit => ({method,headers:{"Content-Type":"application/json"},body:JSON.stringify(args)});
export const create = action({args:validators.profileCreateArgs.fields,returns:validators.profile,handler:async(ctx,args):Promise<Profile>=>{
  validateArgs("profileCreateArgs",args);
  return decode(await requestJson(endpoint(),env.TINYFISH_API_KEY,json("POST",args)),shapes.profileShape) as Profile;
}});
export const list = action({args:{},returns:validators.profilesResponse,handler:async(ctx):Promise<ProfilesResponse>=>decode(await requestJson(endpoint(),env.TINYFISH_API_KEY),shapes.profilesResponseShape) as ProfilesResponse});
export const get = action({args:{profileId:v.string()},returns:validators.profileDetails,handler:async(ctx,{profileId}):Promise<ProfileDetails>=>decode(await requestJson(endpoint(profileId),env.TINYFISH_API_KEY),shapes.profileDetailsShape) as ProfileDetails});
export const update = action({args:{profileId:v.string(),...validators.profileUpdateArgs.fields},returns:validators.profileDetails,handler:async(ctx,{profileId,...args}):Promise<ProfileDetails>=>{
  validateArgs("profileUpdateArgs",args);
  return decode(await requestJson(endpoint(profileId),env.TINYFISH_API_KEY,json("PATCH",args)),shapes.profileDetailsShape) as ProfileDetails;
}});
export const remove = action({args:{profileId:v.string()},returns:v.null(),handler:async(ctx,{profileId})=>{await requestJson(endpoint(profileId),env.TINYFISH_API_KEY,{method:"DELETE"}); return null;}});
export const startSetup = action({args:{profileId:v.string(),...validators.profileSetupArgs.fields},returns:validators.profileSetup,handler:async(ctx,{profileId,...args}):Promise<ProfileSetup>=>{
  validateArgs("profileSetupArgs",args);
  return decode(await requestJson(endpoint(profileId,"/setup-session"),env.TINYFISH_API_KEY,json("POST",args)),shapes.profileSetupShape) as ProfileSetup;
}});
export const saveSetup = action({args:{profileId:v.string(),...validators.profileSaveArgs.fields},returns:validators.profileSaved,handler:async(ctx,{profileId,...args}):Promise<ProfileSaved>=>{
  validateArgs("profileSaveArgs",args);
  return decode(await requestJson(endpoint(profileId,"/save"),env.TINYFISH_API_KEY,json("POST",args)),shapes.profileSavedShape) as ProfileSaved;
}});
export const cancelSetup = action({args:{profileId:v.string(),session_id:v.string()},returns:v.null(),handler:async(ctx,{profileId,session_id})=>{
  nonempty(session_id,"session_id"); await requestJson(endpoint(profileId,"/setup-session/cancel"),env.TINYFISH_API_KEY,json("POST",{session_id})); return null;
}});
export const removeDomain = action({args:{profileId:v.string(),domain:v.string()},returns:v.null(),handler:async(ctx,{profileId,domain})=>{
  nonempty(domain,"domain",253); await requestJson(endpoint(profileId,`/domains/${encodeURIComponent(domain)}`),env.TINYFISH_API_KEY,{method:"DELETE"}); return null;
}});
