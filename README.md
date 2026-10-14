# TinyFish for Convex

TinyFish Search, Fetch, Browser, Web Agent and Browser Context Profiles in one Convex component. Read content as clean Markdown, run durable browser tasks, and subscribe to their progress and structured results. Search/Fetch stay stateless; Agent jobs and steps live in isolated component tables.

## Install

```sh
npm install tinyfish-convex
```

Requires Convex `^1.42.0`. Development of the example uses Node.js 22.12+.

Register the component in `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import { v } from "convex/values";
import tinyfish from "tinyfish-convex/convex.config.js";

const app = defineApp({ env: { TINYFISH_API_KEY: v.string() } });
app.use(tinyfish, {
  env: { TINYFISH_API_KEY: app.env.TINYFISH_API_KEY },
});
export default app;
```

Set `TINYFISH_API_KEY` on the Convex deployment using the dashboard environment-variable editor or your secret-management workflow, then run `npx convex dev`. Keep the key on the backend; do not put it in frontend code or a `VITE_` variable.

## Use from your actions

```ts
import { TinyFish, searchArgs, searchResponse, fetchArgs, fetchResponse } from "tinyfish-convex";
import { action } from "./_generated/server";
import { components } from "./_generated/api";

const tf = new TinyFish(components.tinyfish);

export const search = action({
  args: searchArgs.fields,
  returns: searchResponse,
  handler: async (ctx, args) => {
    if (!(await ctx.auth.getUserIdentity())) throw new Error("Sign in first");
    return tf.search(ctx, args);
  },
});

export const fetch = action({
  args: fetchArgs.fields,
  returns: fetchResponse,
  handler: async (ctx, args) => {
    if (!(await ctx.auth.getUserIdentity())) throw new Error("Sign in first");
    return tf.fetch(ctx, args);
  },
});
```

Use your application's normal authorization and quotas before exposing metered calls publicly. Use `internalAction` for a server-only workflow. Component actions become internal references in the host app and cannot be invoked directly from a frontend.

## Readable Markdown

Use `read` when you need Markdown for an agent, a document or a knowledge base:

```ts
const pages = await tf.read(ctx, {
  urls: ["https://docs.convex.dev/components/authoring"],
  links: true,
});
```

It makes one TinyFish Fetch request with HTML output, then converts that extraction into Markdown in the standard Convex runtime. It preserves multiline code, renders single-line symbols inline, retains table fields and resolves relative links. Raw Markdown documents returned as text are kept verbatim. The public `fetch` method still passes through TinyFish's requested Markdown/HTML/JSON format unchanged.

`read` accepts the Fetch options except `format`, since its result format is always Markdown. It keeps metadata, conditional null results and per-URL errors. A page that cannot be converted is reported as `markdown_conversion_failed`; successful pages remain available. It adds no hidden retry or extra provider request. HTML is parsed as data, without executing scripts or fetching linked resources.

## Search → read in one call

```ts
const result = await tf.research(ctx, {
  search: {
    query: "Convex components authoring",
    include_domains: "docs.convex.dev",
    purpose: "Understand component installation",
  },
  maxSources: 3,
  read: { links: true, exclude_selectors: ["nav"] },
});
```

`research` returns `{ sources, pages }`. It validates options before Search, deduplicates result URLs, reads at most 1–10 sources (default 3), and skips Fetch when no sources are found. In that case `pages` is `null`. Inspect `pages.errors` alongside successful pages. The search purpose carries into Read unless explicitly overridden. Your host app still owns authentication and persistence.

A complete server-only action is now a small adapter. Save this as `convex/research.ts`:

```ts
import { researchArgs, researchResponse, TinyFish } from "tinyfish-convex";
import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";

const tinyfish = new TinyFish(components.tinyfish);

/** A complete server-only Search → Fetch workflow. No auth provider is needed for CLI testing. */
export const read = internalAction({
  args: researchArgs.fields,
  returns: researchResponse,
  handler: (ctx, args) => tinyfish.research(ctx, args),
});
```

After `npx convex dev` generates your bindings, run:

```sh
npx convex run research:read '{"search":{"query":"Convex components authoring","include_domains":"docs.convex.dev"},"maxSources":3}'
```

Direct calls are also available:

```ts
await ctx.runAction(components.tinyfish.search.query, { query: "Convex" });
await ctx.runAction(components.tinyfish.fetch.getContents, { urls: ["https://docs.convex.dev"] });
```

## Durable Web Agent

Mount an authenticated API in your app's `convex/agent.ts`:

```ts
import { makeAgentAPI } from "tinyfish-convex";
import { components } from "./_generated/api";

export const { start, get, steps, list, cancel, resume, result, resultUrl, forget } =
  makeAgentAPI(components.tinyfish, {
    authorize: async (ctx, operation) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Sign in first");
      // Apply your application's quotas and operation permissions here.
      return identity.tokenIdentifier;
    },
  });
```

In React, call the host functions using Convex's normal hooks:

```ts
const start = useMutation(api.agent.start);
const jobId = await start({
  idempotencyKey: crypto.randomUUID(), // retain this key when retrying submission
  request: {
    url: "https://quotes.toscrape.com",
    goal: "Open page 2, wait for navigation, then extract its first quote and author",
    output_schema: {
      type: "object",
      properties: { quote: { type: "string" }, author: { type: "string" } },
      required: ["quote", "author"],
    },
  },
});
// Store jobId in your application, then render a subscribing component:
const job = useQuery(api.agent.get, { jobId });
```

The subscription updates as the backend polls TinyFish. Closing or refreshing the page does not cancel the run. One owner/key pair creates one job; a changed request with the same key raises `IDEMPOTENCY_CONFLICT`. Keep owner IDs server-derived. Low-level `tf.agent.start/get/list/steps/cancel/resume/forget/result/resultUrl/reconcile` methods are available in host mutations, queries and actions.

Defaults are 50 steps and 600 seconds; override with `agent_config`. Polling defaults to 5 seconds and can be set to 2–60 seconds through the low-level start method. `output_schema`, `browser_profile`, `proxy_config`, `capture_config`, explicitly authorized Profiles and Vault credential IDs use the documented Agent fields. The component owns callbacks and does not accept `webhook_url`.

| Status | Meaning |
| --- | --- |
| QUEUED / SUBMITTING | Persisted locally / submitting to TinyFish |
| PENDING / RUNNING | TinyFish accepted the run; tracking continues in the backend |
| COMPLETED / FAILED / CANCELLED | Confirmed provider terminal state |
| SUBMISSION_UNKNOWN | A submission failed without a reliable run ID; investigate and reconcile before retrying |
| TRACKING_PAUSED | Eight tracking errors; the upstream run may still be active. Resume tracking or request cancellation |

Cancellation is a request until the provider confirms its state; a concurrent successful completion retains its result. Scheduled watchdogs recover dispatch failures before the handler starts and interrupted polling. Queue dispatch has three recovery attempts; an atomic claim prevents duplicate provider submissions. Submission POSTs are never blindly repeated after an uncertain timeout/5xx. For `SUBMISSION_UNKNOWN`, an authorized server operator can find the run in TinyFish and call `tf.agent.reconcile`; the component fetches it, checks its goal and prevents duplicate tracking. This recovery method is deliberately not in the public API factory.

Results up to 128 KB are available directly on `job.result`. Larger JSON results go to Convex file storage; `job.resultStored` signals availability. Use the authenticated `result` action (up to 7 MB), or `resultUrl` for downloading a larger stored result. Treat storage URLs as bearer access. `forget` removes a terminal job, its steps and stored result; it does not delete the upstream run. Step text is bounded to 4,096 characters. Screenshots and HTML are excluded from background polling, keeping query payloads small.

`steps` and `list` use component-compatible pagination from `convex-helpers`. For multi-page reactive lists, use its `usePaginatedQuery` helper rather than the core hook, or call the cursor API explicitly. Result fields are provider-structured JSON; validate application-specific fields before consequential downstream writes.

## Browser and saved Profiles

```ts
const browser = await tf.browser.create(ctx, {
  url: "https://example.com", timeout_seconds: 300,
});
// In a Node action or external worker:
const connection = await chromium.connectOverCDP(browser.cdp_url);
// Use Playwright, Puppeteer or another CDP client, then close the session.
await tf.browser.close(ctx, { sessionId: browser.session_id });

const profile = await tf.profiles.create(ctx, { name: "Workspace", set_as_default: false });
const setup = await tf.profiles.startSetup(ctx, { profileId: profile.id, timeout_seconds: 300 });
// Connect to setup.cdp_url, sign in, then save that exact session:
const saved = await tf.profiles.saveSetup(ctx, { profileId: profile.id, session_id: setup.session_id });
// Start a tracked job using saved state:
const jobId = await tf.agent.start(ctx, {
  ownerId, idempotencyKey,
  request: { url, goal, use_profile: true, profile_id: profile.id },
});
```

Browser sessions are isolated. Profiles save state for reuse by Agent runs; direct Browser sessions do not automatically attach Profiles. Standard Convex actions can create and terminate sessions; run CDP clients in Node actions or external workers. No Node runtime is needed for component methods.

Profile methods: `create/list/get/update/remove/startSetup/saveSetup/cancelSetup/removeDomain`. Setup responses include `session_id/cdp_url/base_url/timeout_seconds/expires_at`. Save reports written, failed and skipped domains; inspect these instead of assuming every site was saved. Unsaved setup state is discarded on cancellation or expiry. Raw cookies and connection URLs are not cached in component tables.

**Shared API account:** Provider Profiles and Vault belong to the API account, not automatically to a Convex user. Authorize individual IDs on the server. `makeAgentAPI` rejects Profile/Vault requests unless you supply `authorizeRequest`. The example's [resource wrappers](example/convex/resources.ts) store per-owner grants and verify Browser/Profile/setup ownership before using them. Its [Agent wrapper](example/convex/agent.ts) requires an explicitly granted Profile and refuses global Vault access. Do not expose `profiles.list`, account defaults, CDP URLs or `use_vault` indiscriminately to multiple tenants.

References: [Agent endpoints](https://docs.tinyfish.ai/key-concepts/endpoints), [Browser](https://docs.tinyfish.ai/browser-api/reference), [Profile lifecycle](https://docs.tinyfish.ai/agent-api/browser-context-profiles).

## Configuration and behavior

Argument names match TinyFish's REST API.

| Method | Options |
| --- | --- |
| `tf.search(ctx, args)` | `query`, `purpose`, `location`, `language`, `include_domains`, `exclude_domains`, `domain_type`, `recency_minutes`, `after_date`, `before_date`, `pub_year_min`, `pub_year_max`, `page`, `include_thumbnail`, `fetch` |
| `tf.read(ctx, args)` | Fetch options below, excluding `format`; returns readable Markdown |
| `tf.research(ctx, args)` | `search`, `maxSources` (1–10), `read` options (excluding URL and conditional fields) |
| `tf.fetch(ctx, args)` | `urls`, `purpose`, `format`, `links`, `image_links`, `iframe_links`, `page_metadata`, `ttl`, `per_url_timeout_ms`, `include_selectors`, `exclude_selectors`, `if_none_match`, `if_modified_since`, `include_etag_and_last_modified` |

- Fetch accepts 1–10 URLs and returns both `results[]` and `errors[]`. A page failure does not erase successful results; an all-failure batch still returns a Fetch response.
- Selectors accept 1–20 entries. A direct PDF/CSV URL has no HTML to scope and can return `selector_unsupported`.
- Conditional requests require one URL and work only on TinyFish's fast path. Browser-rendered routes can return `conditional_unsupported`. Request `include_etag_and_last_modified: true`, save whichever origin validator is returned (`etag` or `last_modified`), then replay it with `if_none_match` or `if_modified_since`. Validators are optional; the origin may not provide one. Check `not_modified` before skipping processing. Your app owns storage and any explicit unconditional fallback.
- `ttl` is forwarded to TinyFish. Omission accepts cached content; `0` prefers a live fetch, subject to upstream cache policy. The component adds no cache.
- Search's `include_thumbnail` uses the documented `"true"` / `"false"` string. Its optional `fetch` is a JSON-encoded configuration object string. The demo uses separate calls so the user can choose sources.
- Recency filters cannot be combined with calendar dates; paper search uses publication-year bounds.
- HTTP errors throw `ConvexError` data containing `code`, `status`, `message`, and optionally `requestId` / `retryAfter`. Network, timeout, invalid-input and invalid-response errors have distinct codes. Per-URL failures remain in `errors[]`.
- Required response fields are checked. New unknown fields are omitted from the supported interface. JSON document trees and metadata preserve opaque JSON values.
- Each HTTP request has a 150-second deadline, including body reading. Search/Fetch and resource-creation operations have no automatic retry. Agent tracking reads and idempotent cancellation are retried with bounded backoff; uncertain paid submissions are never repeated automatically.
- TinyFish's JSON document tree is not schema-based extraction. In the evaluated product/table pages it omitted some HTML table and country-detail fields; use `read` or HTML when those fields matter.
- Responses must fit Convex's function return-size and value limits. Fetch fewer URLs or scope extraction as needed; this component does not silently truncate results.

The host app owns authentication, quotas, resource grants and its business data. The component owns Agent scheduling, task tables and stored results. Site crawling, the separate beta Research API and account-enabled Highlights are outside this release. The `research` method is a Search → Read recipe, not the beta Research API.

References: [Search](https://docs.tinyfish.ai/search-api/reference), [Fetch](https://docs.tinyfish.ai/fetch-api/reference), [Convex runtime limits](https://docs.convex.dev/production/state/limits).

## Run the real example

Clone [the repository](https://github.com/KeithZhai/tinyfish-convex), then:

```sh
npm ci
# If you already authenticated the TinyFish CLI:
npm run demo -- --use-cli-key
```

Alternatively, supply `TINYFISH_API_KEY` securely in your shell and run `npm run demo`. The command prepares a local Convex deployment, sets its key via stdin, and starts the connected Vite demo. Open the URL printed by Vite.

**Live Convex is the default.** Search with optional domain and purpose controls, choose sources, select an output format, and fetch. Copy or download the returned content or complete JSON result. Requests use the installed component through Convex. No API key or deployment admin credential reaches the browser. The local bridge accepts only fixed localhost routes and rejects foreign origins and simple form requests. Its Agent stream uses a real Convex query subscription through CLI `--watch`. Browser/Profile connection URLs are bearer capabilities displayed only in this local developer session.

The demo's local bridge is developer tooling and is not included in a static production build. For a hosted app, use your usual Convex authentication with the public wrappers shown above. A separately labeled Sample mode remains available for offline Search/Fetch previews. Agent, Browser and Profile controls always use real calls. More details: [example guide](example/README.md).

## Testing and maintenance

```sh
npm run check           # contracts, package build, typechecks, tests, demo build
npm run verify:package  # isolated install, consumer types and test registration
npm run test:live       # real Convex → TinyFish acceptance cases; needs configured key
npm run codegen         # official Convex codegen; needs configured deployment
```

Convex-generated bindings are checked in so ordinary builds and CI need no cloud account. The snapshots in `docs/` drive both validators and response shapes through `scripts/generate-contract.mjs`.

For `convex-test` consumers:

```ts
import tinyfishTest from "tinyfish-convex/test";
const t = convexTest(schema, modules);
tinyfishTest.register(t); // register(t, "customName") supports renamed instances
```

Inline the package in your Vitest config so its test-registration glob is transformed:

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { server: { deps: { inline: ["tinyfish-convex"] } } },
});
```

[Reviewer quick start](docs/WAYNE-QUICKSTART.md) · [Validation record](docs/VALIDATION.md) · [Small live comparison](docs/EVALUATION.md) · [Release procedure](PUBLISHING.md) · [Report an issue](https://github.com/KeithZhai/tinyfish-convex/issues)
