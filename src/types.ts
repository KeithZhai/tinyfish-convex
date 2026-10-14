import type { Infer } from "convex/values";
import type { searchArgs, fetchArgs, searchResponse, fetchResponse } from "./validators.js";
export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
export type SearchArgs = Infer<typeof searchArgs>;
export type FetchArgs = Infer<typeof fetchArgs>;
export type SearchResult = Omit<Infer<typeof searchResponse>["results"][number], "fetch" | "fetch_error"> & {
  fetch?: JsonValue; fetch_error?: JsonValue;
};
export type SearchResponse = Omit<Infer<typeof searchResponse>, "results"> & { results: SearchResult[] };
export type FetchResult = Omit<Infer<typeof fetchResponse>["results"][number], "text" | "page_metadata"> & {
  text: string | { [key: string]: JsonValue } | null;
  page_metadata?: { [key: string]: JsonValue };
};
export type FetchResponse = Omit<Infer<typeof fetchResponse>, "results"> & { results: FetchResult[] };
export type FetchError = FetchResponse["errors"][number];
