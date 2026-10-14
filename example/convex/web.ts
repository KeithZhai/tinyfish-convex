import { action, internalAction } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { TinyFish, searchArgs, fetchArgs, searchResponse, fetchResponse } from "tinyfish-convex";
const tinyfish = new TinyFish(components.tinyfish);
// CLI-only actions let Wayne try the integration before setting up demo auth.
export const search = internalAction({ args: searchArgs.fields, returns: searchResponse,
  handler: (ctx, args) => tinyfish.search(ctx, args) });
export const fetch = internalAction({ args: fetchArgs.fields, returns: fetchResponse,
  handler: (ctx, args) => tinyfish.fetch(ctx, args) });
// The browser demo requires an authenticated Convex identity. Configure an auth
// provider for live mode. Samples need no backend or key.
export const searchDemo = action({ args: searchArgs.fields, returns: searchResponse,
  handler: async (ctx, args) => {
    if (!await ctx.auth.getUserIdentity()) throw new Error("Sign in to use the live demo");
    return tinyfish.search(ctx, args);
  } });
export const fetchDemo = action({ args: fetchArgs.fields, returns: fetchResponse,
  handler: async (ctx, args) => {
    if (!await ctx.auth.getUserIdentity()) throw new Error("Sign in to use the live demo");
    return tinyfish.fetch(ctx, args);
  } });
