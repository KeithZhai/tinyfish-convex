import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { ConvexError, type Value } from "convex/values";
import { defineSchema, makeFunctionReference } from "convex/server";
import { register } from "../src/test.js";
import { TinyFish } from "../src/client/index.js";
import { REQUEST_TIMEOUT_MS } from "../src/component/lib/http.js";
import { decodeFetch, decodeSearch } from "../src/component/lib/response.js";
import { validateSearch, validateFetch } from "../src/component/lib/input.js";
const source = { position: 1, site_name: "example.com", title: "Example", snippet: "A source", url: "https://example.com" };
const searchResponse = { query: "convex & tinyfish", results: [source], total_results: 1, page: 0 };
const page = { url: "https://example.com", final_url: "https://example.com/", title: "Example", description: null, language: "en", format: "markdown", text: "# Example", author: null, published_date: null };
const fetchResponse = { results: [page], errors: [] };
const http = vi.fn<typeof fetch>();
function setup() { const t = convexTest(defineSchema({}), import.meta.glob("../example/convex/**/*.{ts,js}")); const component = register(t); return { t, component, tf: new TinyFish(component) }; }
function json(data: unknown, status = 200, headers: Record<string, string> = {}) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } }); }
beforeEach(() => { vi.stubGlobal("fetch", http); vi.stubEnv("TINYFISH_API_KEY", "test-key-never-real"); http.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
async function errorData(promise: Promise<unknown>) { try { await promise; throw new Error("Expected failure"); } catch (e) { expect(e).toBeInstanceOf(ConvexError); return (e as ConvexError<Value>).data; } }
describe("component actions and typed client", () => {
  it("rejects unauthenticated browser requests before calling TinyFish", async () => {
    const { t } = setup();
    await expect(t.action(makeFunctionReference<"action">("web:searchDemo"), { query: "test" })).rejects.toThrow("Sign in");
    await expect(t.action(makeFunctionReference<"action">("web:fetchDemo"), { urls: ["https://example.com"] })).rejects.toThrow("Sign in");
    expect(http).not.toHaveBeenCalled();
  });
  it("allows an authenticated host action to use the compiled package", async () => {
    http.mockResolvedValue(json(searchResponse)); const { t } = setup();
    expect(await t.withIdentity({ subject: "demo-user" }).action(makeFunctionReference<"action">("web:searchDemo"), { query: "test" })).toEqual(searchResponse);
  });
  it("calls Search with encoded query options and a server-side API key", async () => {
    http.mockResolvedValue(json(searchResponse)); const { t, component } = setup();
    expect(await t.action(component.search.query, { query: "convex & tinyfish", page: 0, include_domains: "docs.convex.dev,github.com", include_thumbnail: "false" })).toEqual(searchResponse);
    const [url, init] = http.mock.calls[0]; const parsed = new URL(String(url));
    expect(parsed.origin).toBe("https://api.search.tinyfish.ai"); expect(parsed.searchParams.get("query")).toBe("convex & tinyfish");
    expect(parsed.searchParams.get("page")).toBe("0"); expect(parsed.searchParams.has("language")).toBe(false);
    expect(init?.headers).toMatchObject({ "X-API-Key": "test-key-never-real" }); expect(init?.redirect).toBe("error");
  });
  it("forwards all supported Fetch options, including false and ttl=0", async () => {
    http.mockResolvedValue(json(fetchResponse)); const { t, component } = setup();
    const args = { urls: ["https://example.com"], format: "json" as const, links: false, image_links: true, iframe_links: true, page_metadata: true, ttl: 0, per_url_timeout_ms: 110000, include_selectors: ["article"], exclude_selectors: ["nav"], include_etag_and_last_modified: true, purpose: "Read API docs" };
    await t.action(component.fetch.getContents, args);
    const [url, init] = http.mock.calls[0]; expect(String(url)).toBe("https://api.fetch.tinyfish.ai/"); expect(init?.method).toBe("POST"); expect(JSON.parse(String(init?.body))).toEqual(args);
  });
  it("works through TinyFish inside a host action context", async () => {
    http.mockResolvedValue(json(searchResponse)); const { t, tf } = setup();
    expect(await t.action(ctx => tf.search(ctx, { query: "convex & tinyfish" }))).toEqual(searchResponse);
    http.mockResolvedValue(json(fetchResponse)); expect(await t.action(ctx => tf.fetch(ctx, { urls: ["https://example.com"] }))).toEqual(fetchResponse);
  });
  it("reads HTML as Markdown in one request while retaining page errors and metadata", async () => {
    const errors = [{ url: "https://example.org", error: "page_not_found", status: 404 }];
    http.mockResolvedValue(json({ results: [{ ...page, format: "html", text: '<p>Use <code>API_KEY</code>.</p>', etag: '"v1"' }], errors }));
    const { t, tf } = setup();
    const result = await t.action(ctx => tf.read(ctx, { urls: ["https://example.com", "https://example.org"], ttl: 0 }));
    expect(result.results[0]).toMatchObject({ text: 'Use `API_KEY`.', format: "markdown", etag: '"v1"' });
    expect(result.errors).toEqual(errors);
    expect(JSON.parse(String(http.mock.calls[0][1]?.body))).toMatchObject({ format: "html", ttl: 0 });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("preserves an unchanged conditional Read with null content", async () => {
    http.mockResolvedValue(json({ results: [{ ...page, format: "html", text: null, not_modified: true }], errors: [] }));
    const { t, tf } = setup();
    expect((await t.action(ctx => tf.read(ctx, { urls: ["https://example.com"], if_none_match: '"v1"' }))).results[0]).toMatchObject({ text: null, not_modified: true, format: "markdown" });
  });
  it("makes a conversion failure visible per page while preserving a successful page", async () => {
    http.mockResolvedValue(json({ results: [{ ...page, format: "html", text: "<h1>Example</h1>" }, { ...page, url: "https://example.org", format: "json", text: { bad: true } }], errors: [] }));
    const { t, tf } = setup(); const result = await t.action(ctx => tf.read(ctx, { urls: ["https://example.com", "https://example.org"] }));
    expect(result.results).toHaveLength(1);
    expect(result.errors).toEqual([{ url: "https://example.org", error: "markdown_conversion_failed" }]);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("rejects invalid research read options before spending the Search call", async () => {
    const { t, tf } = setup();
    expect(await errorData(t.action(ctx => tf.research(ctx, { search: { query: "test" }, read: { include_selectors: [] } })))).toMatchObject({ code: "INVALID_INPUT" });
    expect(http).not.toHaveBeenCalled();
  });
  it("runs the complete research recipe, deduplicating sources and retaining partial failures", async () => {
    const sources = { ...searchResponse, results: [source, { ...source, position: 2 }, { ...source, position: 3, url: "https://example.org" }] };
    const pages = { results: [page], errors: [{ url: "https://example.org", error: "page_not_found", status: 404 }] };
    http.mockResolvedValueOnce(json(sources)).mockResolvedValueOnce(json({ ...pages, results: [{ ...page, format: "html", text: "<h1>Example</h1>" }] }));
    const { t } = setup();
    const result = await t.action(makeFunctionReference<"action">("research:read"), { search: { query: "test", purpose: "Read the API" }, maxSources: 2 });
    expect(result).toEqual({ sources, pages });
    expect(JSON.parse(String(http.mock.calls[1][1]?.body))).toMatchObject({ urls: ["https://example.com", "https://example.org"], purpose: "Read the API" });
    expect(http).toHaveBeenCalledTimes(2);
  });
  it("skips a metered Fetch when the research recipe finds no sources", async () => {
    const sources = { ...searchResponse, results: [], total_results: 0 };
    http.mockResolvedValue(json(sources)); const { t } = setup();
    expect(await t.action(makeFunctionReference<"action">("research:read"), { search: { query: "test" } })).toEqual({ sources, pages: null });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("rejects an invalid source limit before spending a search call", async () => {
    const { t } = setup();
    expect(await errorData(t.action(makeFunctionReference<"action">("research:read"), { search: { query: "test" }, maxSources: 11 }))).toMatchObject({ code: "INVALID_INPUT" });
    expect(http).not.toHaveBeenCalled();
  });
  it("preserves partial failures and selector retry hints", async () => {
    const response = { results: [page], errors: [{ url: "https://example.org", error: "selector_not_matched", unmatched_selectors: ["article"], candidate_selectors: ["main"] }], request_id: "partial-id" };
    http.mockResolvedValue(json(response)); const { t, component } = setup();
    expect(await t.action(component.fetch.getContents, { urls: ["https://example.com", "https://example.org"] })).toEqual(response);
  });
  it("returns a batch where every URL failed without throwing an HTTP error", async () => {
    const response = { results: [], errors: [{ url: "https://example.com", error: "page_not_found", status: 404 }] };
    http.mockResolvedValue(json(response)); const { t, component } = setup();
    expect(await t.action(component.fetch.getContents, { urls: ["https://example.com"] })).toEqual(response);
  });
  it("supports conditional results, null content and nullable redirects", async () => {
    const response = { results: [{ ...page, text: null, final_url: null, not_modified: true, etag: 'W/"old"', last_modified: "Wed, 21 Oct 2015 07:28:00 GMT" }], errors: [] };
    http.mockResolvedValue(json(response)); const { t, component } = setup();
    expect(await t.action(component.fetch.getContents, { urls: ["https://example.com"], if_none_match: 'W/"old"' })).toEqual(response);
  });
  it("preserves opaque JSON content, metadata, and rich search fields", async () => {
    expect(decodeFetch({ ...fetchResponse, results: [{ ...page, format: "json", text: { children: [{ text: "Example" }] }, page_metadata: { og: { image: ["https://example.com/og.png"] } } }] }).results[0].text).toEqual({ children: [{ text: "Example" }] });
    expect(decodeSearch({ ...searchResponse, results: [{ ...source, authors: ["A"], year: 2026, fetch: { text: "body" }, fetch_error: null }] }).results[0].authors).toEqual(["A"]);
  });
  it("rejects a malformed opaque content field", () => {
    expect(() => decodeFetch({ ...fetchResponse, results: [{ ...page, text: 42 }] })).toThrow(ConvexError);
  });
  it("tolerates new provider fields while keeping its supported response shape", async () => {
    expect(decodeSearch({ ...searchResponse, future: true, results: [{ ...source, future: true }] })).toEqual(searchResponse);
  });
  it.each([null, {}, { ...searchResponse, results: {} }, { ...searchResponse, results: [{ ...source, title: null }] }])("rejects malformed successful responses: %j", async response => {
    http.mockResolvedValue(json(response)); const { t, component } = setup();
    expect(await errorData(t.action(component.search.query, { query: "test" }))).toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("enforces Convex argument validators", async () => {
    const { t, component } = setup();
    // @ts-expect-error Verify the runtime boundary rejects untyped callers.
    await expect(t.action(component.fetch.getContents, { urls: ["https://example.com"], format: "xml" })).rejects.toThrow();
    expect(http).not.toHaveBeenCalled();
  });
});
describe("HTTP failure semantics", () => {
  it.each([401, 402, 403, 429, 500, 503])("returns a structured HTTP %i error without retrying", async status => {
    http.mockResolvedValue(json({ error: { code: "UPSTREAM_CODE", message: "test-key-never-real" }, request_id: "request-1" }, status, { "Retry-After": "30" }));
    const { t, component } = setup(); const data = await errorData(t.action(component.search.query, { query: "test" }));
    expect(data).toMatchObject({ code: "UPSTREAM_CODE", status, requestId: "request-1", retryAfter: "30" });
    expect(JSON.stringify(data)).not.toContain("test-key-never-real"); expect(http).toHaveBeenCalledTimes(1);
  });
  it("handles a gateway's HTML response", async () => {
    http.mockResolvedValue(new Response("<h1>Bad Gateway</h1>", { status: 502 })); const { t, component } = setup();
    expect(await errorData(t.action(component.search.query, { query: "test" }))).toMatchObject({ code: "HTTP_ERROR", status: 502 });
  });
  it("does not leak network exception details", async () => {
    http.mockRejectedValue(new Error("test-key-never-real")); const { t, component } = setup();
    expect(await errorData(t.action(component.search.query, { query: "test" }))).toEqual({ code: "NETWORK_ERROR", message: "Unable to reach TinyFish" });
  });
  it("rejects missing credentials before any HTTP request", async () => {
    vi.stubEnv("TINYFISH_API_KEY", ""); const { t, component } = setup();
    expect(await errorData(t.action(component.search.query, { query: "test" }))).toMatchObject({ code: "MISSING_API_KEY" }); expect(http).not.toHaveBeenCalled();
  });
  it("aborts after the documented timeout", async () => {
    vi.useFakeTimers(); http.mockImplementation((_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
    const { t, component } = setup(); const pending = errorData(t.action(component.fetch.getContents, { urls: ["https://example.com"] }));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    expect(await pending).toMatchObject({ code: "TIMEOUT" }); expect(vi.getTimerCount()).toBe(0);
  });
  it("reports TIMEOUT when headers arrive but the response body stalls", async () => {
    vi.useFakeTimers();
    http.mockImplementation(async (_url, init) => ({
      ok: true, status: 200,
      json: () => new Promise((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))),
    }) as Response);
    const { t, component } = setup();
    const pending = errorData(t.action(component.fetch.getContents, { urls: ["https://example.com"] }));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ code: "TIMEOUT", message: "TinyFish request exceeded 150 seconds" });
    expect(vi.getTimerCount()).toBe(0);
    expect(http).toHaveBeenCalledTimes(1);
  });
});
describe("semantic input validation before spending an API call", () => {
  it.each([
    { query: " " }, { query: "x".repeat(2001) }, { query: "test", page: 11 }, { query: "test", page: 0.5 },
    { query: "test", recency_minutes: 0 }, { query: "test", recency_minutes: 5, after_date: "2026-01-01" },
    { query: "test", after_date: "2026-02-30" }, { query: "test", after_date: "2026-03-01", before_date: "2026-01-01" },
    { query: "test", pub_year_min: 2020 }, { query: "test", domain_type: "research_paper" as const, before_date: "2026-01-01" },
    { query: "test", domain_type: "research_paper" as const, pub_year_min: 2026, pub_year_max: 2020 },
    { query: "test", fetch: "[]" }, { query: "test", fetch: "invalid" },
  ])("rejects invalid search combinations: %j", args => { expect(() => validateSearch(args)).toThrow(ConvexError); });
  it.each([
    { urls: [] }, { urls: Array(11).fill("https://example.com") }, { urls: ["file:///etc/passwd"] }, { urls: ["bad url"] }, { urls: ["https://user:pass@example.com"] },
    { urls: ["https://example.com"], ttl: -1 }, { urls: ["https://example.com"], per_url_timeout_ms: 110001 },
    { urls: ["https://example.com", "https://example.org"], if_none_match: "etag" },
    { urls: ["https://example.com"], include_selectors: [] }, { urls: ["https://example.com"], exclude_selectors: [" "] },
  ])("rejects invalid fetch combinations: %j", args => { expect(() => validateFetch(args)).toThrow(ConvexError); });
  it("supports valid boundary options", () => {
    expect(() => validateSearch({ query: "test", page: 0, domain_type: "research_paper", pub_year_min: 0, pub_year_max: 9999 })).not.toThrow();
    expect(() => validateFetch({ urls: ["https://example.com"], ttl: 0, per_url_timeout_ms: 110000 })).not.toThrow();
  });
});
