import { v } from "convex/values";
import { fetchArgs, fetchResponse, searchArgs, searchResponse } from "./validators.js";

const { format: _format, ...readFields } = fetchArgs.fields;
/** Read returns Markdown rendered from TinyFish's HTML extraction. */
export const readArgs = v.object(readFields);
const { urls: _urls, if_none_match: _etag, if_modified_since: _modified, ...readOptions } = readFields;
export const researchArgs = v.object({
  search: searchArgs,
  maxSources: v.optional(v.number()),
  read: v.optional(v.object(readOptions)),
});
export const researchResponse = v.object({ sources: searchResponse, pages: v.union(v.null(), fetchResponse) });
