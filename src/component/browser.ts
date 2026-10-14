import { v } from "convex/values";
import { action, env } from "./_generated/server.js";
import { browserArgs, browserSession } from "../agent_validators.js";
import { browserSessionShape } from "./lib/agent_shapes.js";
import { decode } from "./lib/response.js";
import { requestJson } from "./lib/http.js";
import { validateArgs, nonempty, invalid, httpUrl } from "./lib/agent_input.js";
import type { BrowserSession } from "../types.js";
export const create = action({ args: browserArgs.fields, returns: browserSession, handler: async (ctx,args): Promise<BrowserSession> => {
  validateArgs("browserArgs",args);
  if (args.proxy_config?.type === "custom" && args.proxy_config.enabled !== false) {
    if (!args.proxy_config.url || args.proxy_config.country_code) invalid("Custom proxy requires url and cannot use country_code");
    httpUrl(args.proxy_config.url);
  }
  return decode(await requestJson("https://api.browser.tinyfish.ai/", env.TINYFISH_API_KEY, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(args)}), browserSessionShape) as BrowserSession;
}});
export const close = action({ args: {sessionId:v.string()}, returns:v.null(), handler: async(ctx,{sessionId}) => {
  nonempty(sessionId,"sessionId");
  await requestJson(`https://api.browser.tinyfish.ai/${encodeURIComponent(sessionId)}`,env.TINYFISH_API_KEY,{method:"DELETE"});
  return null;
}});
