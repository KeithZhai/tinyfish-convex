# Changelog

## 0.1.1

- Correctly report TIMEOUT when response headers arrive but the body stalls.
- Complete, typed Search → Fetch recipe with source limits, URL deduplication, empty-search handling and partial-failure preservation.
- Live demo domain and purpose controls; copy/download output; accessible progress and empty/all-failure states.
- Regression tests for the stalled-body deadline and the complete research workflow.
- Reviewer quick start and expanded live acceptance for Unicode and conditional requests.

## 0.1.0

- Typed stateless Search and Fetch component actions and server-side client.
- Required component API-key environment, semantic argument checks and supported-response validation.
- Batch Fetch failures, selectors, metadata and conditional-request options.
- Structured HTTP/network errors and a bounded request deadline.
- Live local Convex demo with Markdown/HTML/JSON output selection and no browser key entry.
- Automated package, example and boundary tests; real REST acceptance cases.
- Initial live comparison with Firecrawl's documented keyless API on five shared sources.
