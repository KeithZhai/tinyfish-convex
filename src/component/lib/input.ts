import { ConvexError } from "convex/values";
import type { SearchArgs, FetchArgs } from "../../types.js";
function invalid(message: string): never { throw new ConvexError({ code: "INVALID_INPUT", message }); }
function integer(name: string, value: number | undefined, min: number, max = Number.MAX_SAFE_INTEGER) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) invalid(`${name} must be an integer between ${min} and ${max}`);
}
function nonempty(name: string, value: string | undefined, max = Number.MAX_SAFE_INTEGER) {
  if (value !== undefined && (!value.trim() || value.length > max)) invalid(`${name} must be non-empty and at most ${max} characters`);
}
function date(name: string, value: string | undefined) {
  if (value === undefined) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid(`${name} must be a valid YYYY-MM-DD date`);
  const parsed = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid(`${name} must be a valid YYYY-MM-DD date`);
}
export function validateSearch(args: SearchArgs) {
  nonempty("query", args.query, 2000); nonempty("purpose", args.purpose, 2000);
  integer("page", args.page, 0, 10); integer("recency_minutes", args.recency_minutes, 1, 5256000);
  integer("pub_year_min", args.pub_year_min, 0, 9999); integer("pub_year_max", args.pub_year_max, 0, 9999);
  date("after_date", args.after_date); date("before_date", args.before_date);
  if (args.recency_minutes !== undefined && (args.after_date !== undefined || args.before_date !== undefined)) invalid("recency_minutes cannot be combined with date bounds");
  if (args.after_date && args.before_date && args.after_date > args.before_date) invalid("after_date must be on or before before_date");
  if (args.domain_type === "research_paper" && (args.recency_minutes !== undefined || args.after_date !== undefined || args.before_date !== undefined)) invalid("Research paper search uses publication-year bounds, not date or recency filters");
  if ((args.pub_year_min !== undefined || args.pub_year_max !== undefined) && args.domain_type !== "research_paper") invalid("Publication-year bounds require domain_type=research_paper");
  if (args.pub_year_min !== undefined && args.pub_year_max !== undefined && args.pub_year_min > args.pub_year_max) invalid("pub_year_min must be on or before pub_year_max");
  if (args.fetch !== undefined) {
    if (args.fetch.length > 256) invalid("fetch configuration must be at most 256 characters");
    try { const v: unknown = JSON.parse(args.fetch); if (!v || typeof v !== "object" || Array.isArray(v)) invalid("fetch must encode a JSON object"); }
    catch { invalid("fetch must encode a JSON object"); }
  }
}
export function validateFetch(args: FetchArgs) {
  if (args.urls.length < 1 || args.urls.length > 10) invalid("Fetch requires between 1 and 10 URLs");
  for (const raw of args.urls) {
    try { const u = new URL(raw); if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) invalid("Fetch URLs must use HTTP(S) without embedded credentials"); }
    catch { invalid("Fetch URLs must use HTTP(S) without embedded credentials"); }
  }
  nonempty("if_none_match", args.if_none_match); nonempty("if_modified_since", args.if_modified_since);
  if (args.urls.length !== 1 && (args.if_none_match !== undefined || args.if_modified_since !== undefined)) invalid("Conditional fetch requires exactly one URL");
  validateFetchOptions(args);
}
export function validateFetchOptions(args: Omit<FetchArgs, "urls">) {
  nonempty("purpose", args.purpose, 2000); integer("ttl", args.ttl, 0);
  integer("per_url_timeout_ms", args.per_url_timeout_ms, 1, 110000);
  for (const name of ["include_selectors", "exclude_selectors"] as const) {
    const selectors = args[name];
    if (selectors !== undefined) {
      if (!selectors.length || selectors.length > 20) invalid(`${name} requires 1–20 selectors`);
      for (const selector of selectors) nonempty(name, selector, 1000);
    }
  }
}
