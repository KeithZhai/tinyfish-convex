import { researchArgs, researchResponse, TinyFish } from "tinyfish-convex";
import { internalAction } from "./_generated/server.js";
import { components } from "./_generated/api.js";

const tinyfish = new TinyFish(components.tinyfish);

/** A complete server-only Search → Fetch workflow. No auth provider is needed for CLI testing. */
export const read = internalAction({
  args: researchArgs.fields,
  returns: researchResponse,
  handler: (ctx, args) => tinyfish.research(ctx, args),
});
