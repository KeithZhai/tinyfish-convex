import { ConvexError, v } from "convex/values";
import { TinyFish, searchResponse, fetchResponse } from "tinyfish-convex";
import { internalAction } from "./_generated/server.js";
import { components } from "./_generated/api.js";

const tinyfish = new TinyFish(components.tinyfish);

/** A complete server-only Search → Fetch workflow. No auth provider is needed for CLI testing. */
export const read = internalAction({
  args: {
    query: v.string(),
    include_domains: v.optional(v.string()),
    purpose: v.optional(v.string()),
    maxSources: v.optional(v.number()),
  },
  returns: v.object({ sources: searchResponse, pages: v.union(v.null(), fetchResponse) }),
  handler: async (ctx, { maxSources = 3, ...args }) => {
    if (!Number.isSafeInteger(maxSources) || maxSources < 1 || maxSources > 10) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "maxSources must be an integer between 1 and 10" });
    }
    const sources = await tinyfish.search(ctx, args);
    const urls = [...new Set(sources.results.map(source => source.url))].slice(0, maxSources);
    if (!urls.length) return { sources, pages: null };
    const pages = await tinyfish.fetch(ctx, {
      urls, format: "markdown", links: true,
      ...(args.purpose === undefined ? {} : { purpose: args.purpose }),
    });
    return { sources, pages };
  },
});
