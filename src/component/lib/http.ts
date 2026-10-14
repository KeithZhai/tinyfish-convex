import { ConvexError } from "convex/values";
export const SEARCH_ENDPOINT = "https://api.search.tinyfish.ai/";
export const FETCH_ENDPOINT = "https://api.fetch.tinyfish.ai/";
// Fetch docs recommend >=150s to receive the backend/CDN timeout cleanly.
export const REQUEST_TIMEOUT_MS = 150_000;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export async function requestJson(url: URL | string, apiKey: string, init: RequestInit = {}): Promise<unknown> {
  if (!apiKey?.trim()) throw new ConvexError({ code: "MISSING_API_KEY", message: "Set TINYFISH_API_KEY on your Convex deployment" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, redirect: "error", signal: controller.signal,
      headers: { Accept: "application/json", "X-API-Key": apiKey, ...init.headers } });
    let data: unknown;
    try { data = await response.json(); }
    catch { throw new ConvexError({ code: response.ok ? "INVALID_RESPONSE" : "HTTP_ERROR", status: response.status, message: "TinyFish returned a non-JSON response" }); }
    if (!response.ok) {
      const error = record(data) && record(data.error) ? data.error : {};
      const requestId = record(data) && typeof data.request_id === "string" ? data.request_id : response.headers.get("X-Request-ID");
      const retryAfter = response.headers.get("Retry-After");
      throw new ConvexError({ code: typeof error.code === "string" ? error.code : "HTTP_ERROR",
        status: response.status,
        // Avoid returning raw upstream bodies or reflected credentials to callers.
        message: `TinyFish request failed (HTTP ${response.status})`,
        ...(requestId ? { requestId } : {}), ...(retryAfter ? { retryAfter } : {}) });
    }
    return data;
  } catch (error) {
    if (error instanceof ConvexError) throw error;
    throw new ConvexError({ code: controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR",
      message: controller.signal.aborted ? "TinyFish request exceeded 150 seconds" : "Unable to reach TinyFish" });
  } finally { clearTimeout(timer); }
}
