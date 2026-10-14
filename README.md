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

To search and read sources in one action handler:

```ts
const sources = await tf.search(ctx, {
  query: "Convex components",
  include_domains: "docs.convex.dev,github.com",
  purpose: "Find official integration examples",
});
const urls = sources.results.slice(0, 3).map(source => source.url);
if (urls.length === 0) return { sources, pages: null };
const pages = await tf.fetch(ctx, { urls, format: "markdown", links: true });
// Process pages.errors as well as pages.results.
return { sources, pages };
```

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
- Selectors accept 1–20 entries. Conditional requests require one URL. Your app stores and replays validators.
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

**Live Convex is the default.** Search, choose sources, select an output format, and fetch. Requests use the installed component through Convex. No API key or session JWT is entered in the browser. The local bridge accepts only localhost requests to two fixed internal actions and rejects foreign origins and simple form requests.

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

[Validation record](docs/VALIDATION.md) · [Small live comparison](docs/EVALUATION.md) · [Release procedure](PUBLISHING.md) · [Report an issue](https://github.com/KeithZhai/tinyfish-convex/issues)
