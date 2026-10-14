# Changelog

## 0.2.0

- Browser session creation/termination and Profile metadata/setup/save/cancel APIs, generated from official contracts.
- Durable Agent jobs with atomic start/key deduplication, reactive status/steps, owner checks, cancellation, retry/watchdog recovery, reconciliation and large-result file storage.
- Authenticated API factory and example resource grants; interactive local demo with real Convex subscriptions.

- `read`: HTML-based Markdown conversion that retains code, table fields and relative citations; one upstream Fetch request, no hidden retry.
- `research`: packaged Search → Read composition with early option validation, deduplication, source limits and empty/partial-result handling.
- Fixed raw Markdown preservation and fragmented inline-code rendering, with real code-syntax checks and a 12-page paired evaluation.
- Expanded comparison to seven expected-primary-source search tasks; results and remaining gaps are documented without an overall superiority claim.
- Build stages compilation before replacing outputs, preserving the last working component on failure; demo exit cleans its POSIX process group.

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
