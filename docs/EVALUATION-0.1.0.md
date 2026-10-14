# Small live extraction comparison — October 13, 2026

Both providers were asked to extract Markdown from the same five public URLs. TinyFish requests ran through this Convex component with a real key; Firecrawl used its [documented keyless v2 API](https://firecrawl.dev/agent-onboarding/SKILL.md). Checks used predetermined content phrases, including JavaScript-rendered text and PDF text.

| Source | TinyFish check | Firecrawl check | TinyFish characters | Firecrawl characters |
| --- | --- | --- | ---: | ---: |
| https://docs.convex.dev/components/authoring | Pass | Pass | 29874 | 38372 |
| https://docs.tinyfish.ai/fetch-api/reference | Pass | Pass | 18796 | 25875 |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise | Pass | Pass | 28236 | 53819 |
| https://quotes.toscrape.com/js/ | Pass | Pass | 1080 | 1505 |
| https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf | Pass | Pass | 14 | 17 |

Both passed 5/5 phrase checks. TinyFish returned 78,000 characters across these pages; Firecrawl returned 119,588. That is a 34.8% smaller character payload for this particular set, while retaining the checked phrases. This measures output volume and selected phrase presence, not full semantic completeness or general extraction accuracy.

The runs occurred within the same session. Cache policies, provider tiers and request paths differ. TinyFish's recorded durations include local Convex CLI overhead and one parallel five-URL batch; Firecrawl's timings measure individual direct REST requests on its keyless tier. Consequently, those durations are **not ranked against one another**. Neither a general speed advantage nor overall superiority is established.

The wrapper separately passed eight live acceptance cases covering Search domain filters, paper-year filters, mixed/all-URL failures, three output formats, selector scoping and metadata. See [VALIDATION.md](VALIDATION.md).

This package's concrete convenience is a typed one-shot batch read of up to ten selected sources, plus intent, selectors and metadata exposed in Convex. Firecrawl's component also has durable crawl features that this release does not implement. A broader fair comparison would need a representative held-out corpus, consistent cache/tier settings, full content-quality scoring and repeated runs.
