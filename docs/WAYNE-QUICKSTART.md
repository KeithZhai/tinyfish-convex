# Try TinyFish for Convex

This release covers typed Search and Fetch. It is a stateless component: install it in an existing Convex app and keep your own auth, data model and scheduling.

## Use your own app

1. Run `npm install tinyfish-convex`.
2. Register the component and its backend `TINYFISH_API_KEY` environment as shown in the [README](../README.md#install).
3. Set the key on the Convex deployment, then run `npx convex dev`.
4. Copy the complete [research action](../README.md#search--read-in-one-server-action) into `convex/research.ts` and run:

```sh
npx convex run research:read '{"query":"Convex components authoring","include_domains":"docs.convex.dev","purpose":"Understand component installation","maxSources":3}'
```

Expect `sources.results`, `pages.results` and `pages.errors`. Source counts can vary with live search. A URL that fails is kept in `pages.errors`; successful pages remain available. A zero-result search returns `pages: null` and does not spend a Fetch call.

## Use the connected example

```sh
git clone https://github.com/KeithZhai/tinyfish-convex.git
cd tinyfish-convex
npm ci
# Reuse an already configured TinyFish CLI key:
npm run demo -- --use-cli-key
```

Alternatively, supply `TINYFISH_API_KEY` through your normal shell secret workflow and run `npm run demo`. No Convex cloud account or frontend auth setup is needed for the local example. Open the URL printed by Vite.

The example defaults to Live Convex. Search, select sources, fetch, switch between content and JSON, then copy or download the result. The default domain is `docs.convex.dev`; remove it to search the wider web. The purpose field supplies context to both APIs. Sample mode is explicitly labeled and uses offline fixtures.

## Useful evaluation cases

| Task | What to inspect |
| --- | --- |
| Official-source research | Set the domain filter; verify source URLs and fetched content. |
| Mixed Fetch outcome | Fetch a real URL alongside a nonexistent URL; inspect both `results` and `errors`. |
| JavaScript content | Fetch `https://quotes.toscrape.com/js/`; check for rendered quotes. |
| PDF | Fetch `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`. |
| Output formats | Compare Markdown, raw HTML and the JSON document tree. |
| Conditional reads | Opt in to validators on `https://example.com`, replay its Last-Modified or ETag, and check `not_modified`. Some routes return `conditional_unsupported`; do not treat that as unchanged content. |
| Extraction scope | Pass `include_selectors: ["main"]` and `exclude_selectors: ["nav"]`. |

Run `npm run check` for automated verification and `npm run test:live` for real deployment acceptance. Live tests consume API usage. [Validation](VALIDATION.md) and the [small Firecrawl comparison](EVALUATION.md) record the evidence and its limits.

This release does not implement Agent runs, durable crawls or reactive job tracking. Repository issues are the current support entry point. It is published through Keith Zhai's accounts; an organization-maintained directory release needs agreed long-term ownership.
