# Architecture and release decisions

## Scope

`tinyfish-convex` is a stateless component for TinyFish Search and Fetch. It exposes a server-side `TinyFish` wrapper and direct internal component references. The empty schema lets applications choose their own persistence model.

The implemented workflow is Search → select sources → Fetch → inspect content and per-page failures. Durable crawls, Agent job tracking and beta Highlights require a separate scope.

## Boundaries

- Native `fetch` in the standard Convex runtime; no provider SDK or Node runtime directive.
- `TINYFISH_API_KEY` is a declared, required component environment variable, read inside action handlers.
- Public component actions have argument and return validators. Semantic input checks enforce cross-field rules and documented ranges before spending an API call.
- The host app owns user authentication and authorization. Component actions become internal references and do not read parent tables or auth state.
- The client takes `ComponentApi` and uses a `Pick` of the action context's `runAction` capability.
- Generated bindings and compiled package exports are exercised by the example and isolated consumer checks.

These choices follow the [official Convex authoring docs](https://docs.convex.dev/components/authoring), the [component template](https://github.com/get-convex/templates/tree/main/template-component), and [Wayne Sutton's public authoring guide](https://github.com/waynesutton/convexskills/tree/main/skills/convex-component-authoring).

## Runtime policy

Both validators and response decoders are generated from the same checked-in OpenAPI snapshots. Required provider fields are checked; unknown new fields are omitted from the supported interface, while metadata and document trees preserve opaque JSON values.

The HTTP deadline is 150 seconds. API redirects are rejected so the key is not forwarded to a redirected endpoint. Error bodies and network exception strings are not reflected back to callers. Structured status, code and correlation IDs support application error handling.

The component performs no automatic retries because a lost response may leave uncertainty about whether a metered operation completed. Applications own repetition and quotas. It does not truncate content or persist large pages; requests must fit [Convex runtime limits](https://docs.convex.dev/production/state/limits).

## Usability

The example defaults to real local Convex calls. Its bootstrap command can explicitly reuse the TinyFish CLI's saved key, sends it to Convex via stdin, and launches the connected frontend. No browser key or JWT input is needed.

The developer bridge is bound to localhost, permits only two fixed internal actions, checks Host/Origin, requires JSON and bounds input size. It is excluded from production builds. Hosted applications use their normal authenticated Convex wrappers.

## Evaluation and maintenance

The real component passed acceptance cases on public documentation, JavaScript content and a PDF, including mixed failures and three output formats. A five-page comparison with Firecrawl's documented keyless API found both retained the selected expected phrases; it does not prove general superiority. See [EVALUATION.md](EVALUATION.md).

The initial npm package and repository are published through Keith Zhai's accounts. Repository issues provide the bug-reporting destination. Organization-level ownership and a named long-term engineering maintainer should be established before an official directory submission; this document does not assign staff or promise a support SLA.

Future durable Agent work needs stored upstream run IDs, verified lifecycle notifications, idempotent updates, scheduled reconciliation, reactive status/results, cancellation, tenant checks and failure-injection testing. Those guarantees are outside this release.
