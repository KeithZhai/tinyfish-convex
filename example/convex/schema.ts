import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  resourceGrants:defineTable({ownerId:v.string(),kind:v.union(v.literal("profile"),v.literal("browser"),v.literal("setup")),resourceId:v.string(),profileId:v.optional(v.string())})
    .index("by_resource",["kind","resourceId"]).index("by_owner",["ownerId"]),
});
