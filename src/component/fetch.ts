import { action, env } from "./_generated/server.js";
import { fetchArgs, fetchResponse } from "../validators.js";
import { validateFetch } from "./lib/input.js";
import { requestJson, FETCH_ENDPOINT } from "./lib/http.js";
import { decodeFetch } from "./lib/response.js";
import { readArgs } from "../workflow_validators.js";
import { readableMarkdown } from "./lib/markdown.js";
export const getContents = action({
  args: fetchArgs.fields, returns: fetchResponse,
  handler: async (_ctx, args) => {
    validateFetch(args);
    return decodeFetch(await requestJson(FETCH_ENDPOINT, env.TINYFISH_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args),
    }));
  },
});

/** One upstream call, deterministic Markdown conversion, existing per-URL errors retained. */
export const read = action({
  args: readArgs.fields, returns: fetchResponse,
  handler: async (_ctx, args) => {
    validateFetch(args);
    const response = decodeFetch(await requestJson(FETCH_ENDPOINT, env.TINYFISH_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...args, format: "html" }),
    }));
    const results: typeof response.results = [];
    const errors = [...response.errors];
    for (const page of response.results) {
      try {
        if (page.text !== null && (typeof page.text !== "string" || page.format !== "html")) throw new Error("Expected HTML text");
        results.push({ ...page, format: "markdown", text: page.text === null ? null : readableMarkdown(page.text, page.final_url || page.url) });
      } catch { errors.push({ url: page.url, error: "markdown_conversion_failed" }); }
    }
    return { ...response, results, errors };
  },
});
