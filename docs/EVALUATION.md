# Paired extraction and search evaluation — October 14, 2026

The original five-page smoke comparison was too narrow to establish competitiveness. This evaluation declared 12 extraction pages and seven expected-primary-source search tasks before requests. It includes documentation, long code references, Chinese text, JavaScript quotes, a PDF, a raw Markdown file, product fields and country-detail data. The [manifest](../benchmarks/cases.json) fixes the literal checks and retrieval targets.

Raw TinyFish Fetch and Firecrawl were called as paired, single-URL REST requests with cache preferences `ttl=0` / `maxAge=0`; start order alternated. TinyFish used the authorized user key; Firecrawl used its documented keyless free tier. All compared requests were accepted. `read()` was then evaluated through the actual built Convex component on the same URLs. No rate limit was bypassed and no failed case was removed.

## Extraction results

| Page | TinyFish raw Markdown | Component `read()` | Firecrawl Markdown |
| --- | ---: | ---: | ---: |
| [convex-authoring](https://docs.convex.dev/components/authoring) | 4/4 | 4/4 | 4/4 |
| [promise-en](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) | 5/5 | 5/5 | 5/5 |
| [javascript-quotes](https://quotes.toscrape.com/js/) | 3/3 | 3/3 | 3/3 |
| [pdf](https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf) | 1/1 | 1/1 | 1/1 |
| [promise-zh](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise) | 5/5 | 5/5 | 5/5 |
| [python-structures](https://docs.python.org/3/tutorial/datastructures.html) | 5/5 | 5/5 | 5/5 |
| [rust-ownership](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html) | 5/5 | 5/5 | 5/5 |
| [node-filesystem](https://nodejs.org/api/fs.html) | 5/5 | 5/5 | 5/5 |
| [abort-controller](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) | 4/4 | 4/4 | 4/4 |
| [raw-markdown](https://raw.githubusercontent.com/KeithZhai/tinyfish-convex/v0.1.1/README.md) | 3/5 | 5/5 | 5/5 |
| [product-fields](https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html) | 4/4 | 4/4 | 4/4 |
| [country-table](https://www.scrapethissite.com/pages/simple/) | 5/5 | 5/5 | 5/5 |

The raw TinyFish result passed 49/51 literal checks on 11/12 pages; `read()` and Firecrawl both passed 51/51 on 12/12. These are selected literal-presence checks, **not** full semantic completeness or an overall accuracy score. The failed raw-file checks involved escaped identifiers; they do not mean the underlying information was absent.

The first TypeScript snippet in our frozen README is a stronger practical check: raw TinyFish Markdown produced six TypeScript parser diagnostics; both Firecrawl and `read()` produced zero. `read()` preserves the raw Markdown response rather than re-escaping its code. For HTML pages, it keeps multiline code fenced, converts single-line symbols to inline code, rejoins split prose and preserves table fields. It performs one upstream Fetch call; no fallback request or retry is hidden.

The fenced-block count on the Rust page fell from 126 in raw TinyFish Markdown to 10 with `read()`; the Node filesystem reference fell from 4,745 to 83. This is a formatting indicator, not a ground-truth block count or completeness score. The predefined checks still passed on both pages.

Across this corpus, `read()` returned 382,717 characters and Firecrawl returned 704,873, a 45.7% smaller character payload. That number measures output volume, not semantic completeness, token cost or provider billing. No general cost or accuracy advantage follows from it.

## Search results and remaining gap

Both providers returned the declared primary source in the top five on all seven tasks. The observed mean reciprocal rank of the declared target was 0.821 for TinyFish and 0.893 for Firecrawl; Firecrawl ranked the Rust source first and TinyFish ranked it second. The domain-filter case passed for both. This experiment does **not** show improved TinyFish search ranking. Expected-source retrieval is also narrower than human relevance judging.

The library now supplies `research()` so users can chain typed Search → Read with source limits, deduplication, early option validation and explicit partial failures. That is an integration improvement; it does not rerank the provider's search results.

## Limits and reproducibility

This is one exploratory pass on a small, developer-oriented corpus, with five controls already used during initial development and seven added extraction pages. It is not a blind held-out benchmark, covers only a simple PDF and one JavaScript sandbox, and does not establish behavior on authenticated sites or bot challenges. Account tiers, caches and service paths differ. Request timings are preserved as observations and are not used to claim a general speed advantage. Dollar cost and long-term reliability were not measured.

TinyFish's upstream JSON document output omitted the tested UPC table and country-detail fields, so the improved method uses HTML rather than silently accepting that loss. The original JSON format remains available through `fetch`; it is not advertised as schema-based extraction.

Machine-readable evidence: [provider baseline](benchmark-results/provider-baseline.json) and [component Read](benchmark-results/read.json). Full fetched documents remain local and are not published. The [earlier comparison](EVALUATION-0.1.0.md) is retained as historical evidence.

From a configured source checkout:

```sh
npm run benchmark -- --use-cli-key --firecrawl-keyless
# With the real local Convex demo running in another terminal:
npm run benchmark:read
```

Or supply `TINYFISH_API_KEY` and `FIRECRAWL_API_KEY` through your normal secret workflow. Explicit `--firecrawl-keyless` permits the documented free surface when no Firecrawl key is supplied. Provider access refusals stop that provider's run and are recorded separately. Optional `--save-text` saves the raw extraction to ignored local files for inspection. Reports are written to `.benchmark-results/`; keep keys and private documents out of published reports.

The current component remains stateless Search/Fetch/Read. It has no durable crawl, map or Agent job tracking. Matching Firecrawl's selected checks here is not evidence of overall superiority.
