import { v } from "convex/values";
import { agentArgs } from "./agent_validators.js";
export const jobStatus = v.union(v.literal("QUEUED"),v.literal("SUBMITTING"),v.literal("PENDING"),v.literal("RUNNING"),v.literal("COMPLETED"),v.literal("FAILED"),v.literal("CANCELLED"),v.literal("SUBMISSION_UNKNOWN"),v.literal("TRACKING_PAUSED"));
export const jobError = v.object({code:v.string(),message:v.string(),requestId:v.optional(v.string())});
export const job = v.object({
  jobId:v.string(),ownerId:v.string(),idempotencyKey:v.string(),request:agentArgs,status:jobStatus,
  runId:v.union(v.string(),v.null()),createdAt:v.number(),updatedAt:v.number(),cancelRequested:v.boolean(),
  stepsCount:v.number(),lastAction:v.union(v.string(),v.null()),streamingUrl:v.union(v.string(),v.null()),
  result:v.any(),resultStored:v.boolean(),error:v.union(jobError,v.null()),trackingError:v.union(jobError,v.null()),
  profileAttached:v.union(v.boolean(),v.null()),profileId:v.union(v.string(),v.null()),
});
export const startAgentArgs = v.object({ownerId:v.string(),idempotencyKey:v.string(),request:agentArgs,pollIntervalMs:v.optional(v.number())});
export const ownedJobArgs = v.object({ownerId:v.string(),jobId:v.string()});
export const agentStep = v.object({id:v.string(),stepId:v.string(),sequence:v.number(),timestamp:v.string(),status:v.string(),action:v.union(v.string(),v.null()),duration:v.union(v.string(),v.null())});
