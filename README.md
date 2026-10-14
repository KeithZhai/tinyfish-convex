# TinyFish for Convex

Search the web and fetch selected pages from typed Convex actions. `tinyfish-convex` wraps TinyFish's documented Search and Fetch APIs and stores no data; your application controls authentication and persistence.

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

## Search → read in one server action

Save this as `convex/research.ts`. It limits the number of sources, deduplicates URLs, skips Fetch when Search returns no sources, and retains per-page failures. `purpose` gives TinyFish the context for both operations.

```ts
import { ConvexError, v } from "convex/values";
import { TinyFish, searchResponse, fetchResponse } from "tinyfish-convex";
import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";

const tinyfish = new TinyFish(components.tinyfish);

/** A complete server-only Search → Fetch workflow. No auth provider is needed for CLI testing. */
export const read = internalAction({
  args: {
    query: v.string(),
    include_domains: v.optional(v.string()),
    purpose: v.optional(v.string()),
    maxSources: v.optional(v.number()),
  },
  returns: v.object({ sources: searchResponse, pages: v.union(v.null(), fetchResponse) }),
  handler: async (ctx, { maxSources = 3, ...args }) => {
    if (!Number.isSafeInteger(maxSources) || maxSources < 1 || maxSources > 10) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "maxSources must be an integer between 1 and 10" });
    }
    const sources = await tinyfish.search(ctx, args);
    const urls = [...new Set(sources.results.map(source => source.url))].slice(0, maxSources);
    if (!urls.length) return { sources, pages: null };
    const pages = await tinyfish.fetch(ctx, {
      urls, format: "markdown", links: true,
      ...(args.purpose === undefined ? {} : { purpose: args.purpose }),
    });
    return { sources, pages };
  },
});
```

After `npx convex dev` generates your bindings, run:

```sh
npx convex run research:read '{"query":"Convex components authoring","include_domains":"docs.convex.dev","purpose":"Understand component installation","maxSources":3}'
```

The response contains `sources` and `pages`. Inspect `pages.errors` even when some pages succeed. `pages` is `null` when no sources were found. This action is internal; your frontend can use an authenticated host wrapper.

Direct calls are also available:

```ts
await ctx.runAction(components.tinyfish.search.query, { query: "Convex" });
await ctx.runAction(components.tinyfish.fetch.getContents, { urls: ["https://docs.convex.dev"] });
```

## Configuration and behavior

Argument names match TinyFish's REST API.

| Method | Options |
| --- | --- |
| `tf.search(ctx, args)` | `query`, `purpose`, `location`, `language`, `include_domains`, `exclude_domains`, `domain_type`, `recency_minutes`, `after_date`, `before_date`, `pub_year_min`, `pub_year_max`, `page`, `include_thumbnail`, `fetch` |
| `tf.fetch(ctx, args)` | `urls`, `purpose`, `format`, `links`, `image_links`, `iframe_links`, `page_metadata`, `ttl`, `per_url_timeout_ms`, `include_selectors`, `exclude_selectors`, `if_none_match`, `if_modified_since`, `include_etag_and_last_modified` |

- Fetch accepts 1–10 URLs and returns both `results[]` and `errors[]`. A page failure does not erase successful results; an all-failure batch still returns a Fetch response.
- Selectors accept 1–20 entries. A direct PDF/CSV URL has no HTML to scope and can return `selector_unsupported`.
- Conditional requests require one URL and work only on TinyFish's fast path. Browser-rendered routes can return `conditional_unsupported`. Request `include_etag_and_last_modified: true`, save whichever origin validator is returned (`etag` or `last_modified`), then replay it with `if_none_match` or `if_modified_since`. Validators are optional; the origin may not provide one. Check `not_modified` before skipping processing. Your app owns storage and any explicit unconditional fallback.
- `ttl` is forwarded to TinyFish. Omission accepts cached content; `0` prefers a live fetch, subject to upstream cache policy. The component adds no cache.
- Search's `include_thumbnail` uses the documented `"true"` / `"false"` string. Its optional `fetch` is a JSON-encoded configuration object string. The demo uses separate calls so the user can choose sources.
- Recency filters cannot be combined with calendar dates; paper search uses publication-year bounds.
- HTTP errors throw `ConvexError` data containing `code`, `status`, `message`, and optionally `requestId` / `retryAfter`. Network, timeout, invalid-input and invalid-response errors have distinct codes. Per-URL failures remain in `errors[]`.
- Required response fields are checked. New unknown fields are omitted from the supported interface. JSON document trees and metadata preserve opaque JSON values.
- Each HTTP request has a 150-second deadline, including body reading. No automatic retries are performed; the app owns retry policy for metered operations.
- Responses must fit Convex's function return-size and value limits. Fetch fewer URLs or scope extraction as needed; this component does not silently truncate results.

The host app owns auth, tables and scheduling. This version implements one-shot Search/Fetch; durable crawls, Agent runs, and account-enabled beta Highlights are outside this interface.

References: [Search](https://docs.tinyfish.ai/search-api/reference), [Fetch](https://docs.tinyfish.ai/fetch-api/reference), [Convex runtime limits](https://docs.convex.dev/production/state/limits).

## Run the real example

Clone [the repository](https://github.com/KeithZhai/tinyfish-convex), then:

```sh
npm ci
# If you already authenticated the TinyFish CLI:
npm run demo -- --use-cli-key
```

Alternatively, supply `TINYFISH_API_KEY` securely in your shell and run `npm run demo`. The command prepares a local Convex deployment, sets its key via stdin, and starts the connected Vite demo. Open the URL printed by Vite.

**Live Convex is the default.** Search with optional domain and purpose controls, choose sources, select an output format, and fetch. Copy or download the returned content or complete JSON result. Requests use the installed component through Convex. No API key or session JWT is entered in the browser. The local bridge accepts only localhost requests to two fixed internal actions and rejects foreign origins and simple form requests.

The demo's local bridge is developer tooling and is not included in a static production build. For a hosted app, use your usual Convex authentication with the public wrappers shown above. A separately labeled Sample mode remains available for offline previews. More details: [example guide](example/README.md).

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
