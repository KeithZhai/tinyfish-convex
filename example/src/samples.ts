import type { SearchResponse, FetchResponse } from "tinyfish-convex";
export const sampleSearch: SearchResponse = {
  query: "Convex components", page: 0, total_results: 3,
  results: [
    { position: 1, site_name: "docs.convex.dev", title: "Authoring Convex Components", snippet: "Package actions, functions, and isolated state into reusable modules for any Convex app.", url: "https://docs.convex.dev/components/authoring" },
    { position: 2, site_name: "docs.tinyfish.ai", title: "TinyFish Fetch API", snippet: "Extract clean content from web pages, including pages that need JavaScript rendering.", url: "https://docs.tinyfish.ai/fetch-api/reference" },
    { position: 3, site_name: "example.com", title: "A source that moved", snippet: "This sample demonstrates how an unavailable page is reported alongside successful results.", url: "https://example.com/removed-page" },
  ],
};
export function sampleFetch(urls: string[]): FetchResponse {
  return {
    results: urls.filter(u => !u.includes("removed-page")).map(url => ({
      url, final_url: url, title: url.includes("convex") ? "Authoring Convex Components" : "TinyFish Fetch API", description: null, language: "en", author: null, published_date: null,
      format: "markdown", latency_ms: 820,
      text: url.includes("convex") ? "# Authoring Convex Components\n\nA component packages functions into a reusable module. Install it in convex.config.ts, then call it from your application's actions.\n\nThe host app controls authentication. The component keeps external API access behind a typed boundary.\n\n[Illustrative sample content — not a live fetch.]" : "# TinyFish Fetch API\n\nSend 1–10 URLs and get clean content in Markdown, HTML, or JSON. Each URL succeeds or fails independently.\n\nUse selectors to focus extraction and replay ETag validators to detect changes.\n\n[Illustrative sample content — not a live fetch.]",
    })),
    errors: urls.filter(u => u.includes("removed-page")).map(url => ({ url, error: "page_not_found", status: 404 })),
  };
}
