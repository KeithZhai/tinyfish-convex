import { action, env } from "./_generated/server.js";
import { fetchArgs, fetchResponse } from "../validators.js";
import { validateFetch } from "./lib/input.js";
import { requestJson, FETCH_ENDPOINT } from "./lib/http.js";
import { decodeFetch } from "./lib/response.js";
export const getContents = action({
  args: fetchArgs.fields, returns: fetchResponse,
  handler: async (_ctx, args) => {
    validateFetch(args);
    return decodeFetch(await requestJson(FETCH_ENDPOINT, env.TINYFISH_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args),
    }));
  },
});
