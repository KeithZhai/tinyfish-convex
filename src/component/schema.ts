import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { agentArgs } from "../agent_validators.js";
import { jobStatus, jobError } from "../job_validators.js";
export default defineSchema({
  jobs:defineTable({ownerId:v.string(),idempotencyKey:v.string(),request:agentArgs,status:jobStatus,
    runId:v.union(v.string(),v.null()),updatedAt:v.number(),cancelRequested:v.boolean(),pollIntervalMs:v.number(),
    revision:v.number(),leaseUntil:v.number(),failures:v.number(),stepsCount:v.number(),lastAction:v.union(v.string(),v.null()),
    streamingUrl:v.union(v.string(),v.null()),result:v.any(),resultStorageId:v.optional(v.id("_storage")),
    error:v.union(jobError,v.null()),trackingError:v.union(jobError,v.null()),
    profileAttached:v.union(v.boolean(),v.null()),profileId:v.union(v.string(),v.null()),
  }).index("by_owner_key",["ownerId","idempotencyKey"]).index("by_owner",["ownerId"]).index("by_run",["runId"]),
  steps:defineTable({jobId:v.id("jobs"),stepId:v.string(),sequence:v.number(),timestamp:v.string(),status:v.string(),action:v.union(v.string(),v.null()),duration:v.union(v.string(),v.null())})
    .index("by_job_step",["jobId","stepId"]).index("by_job_sequence",["jobId","sequence"]),
});
