import { action, env } from "./_generated/server.js";
import { searchArgs, searchResponse } from "../validators.js";
import { validateSearch } from "./lib/input.js";
import { requestJson, SEARCH_ENDPOINT } from "./lib/http.js";
import { decodeSearch } from "./lib/response.js";
export const query = action({
  args: searchArgs.fields, returns: searchResponse,
  handler: async (_ctx, args) => {
    validateSearch(args);
    const url = new URL(SEARCH_ENDPOINT);
    for (const [key, value] of Object.entries(args)) if (value !== undefined) url.searchParams.set(key, String(value));
    return decodeSearch(await requestJson(url, env.TINYFISH_API_KEY));
  },
});
