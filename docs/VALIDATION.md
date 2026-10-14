# Validation record — October 13, 2026

The 0.1.1 patch was reviewed with the checks below. Registry rows record the already published 0.1.0 release until the 0.1.1 registry consumer check is complete.

| Check | Result |
| --- | --- |
| Package and example TypeScript checks | Passed |
| Vitest / convex-test / local bridge boundary tests | 61 passed |
| Vite production build | Passed |
| Official Convex component codegen | Passed |
| Local Convex component deployment | Passed with a real TinyFish key |
| Isolated tarball install and consumer types | Passed |
| Minimum Convex 1.42 consumer TypeScript check | Passed |
| Installed component test helper | Passed in an isolated consumer |
| Live Convex → TinyFish acceptance | 13/13 cases passed |
| Shared-source live extraction comparison | TinyFish 5/5 and Firecrawl 5/5 phrase checks |
| Real browser workflow | Domain-filtered Search returned 6 sources; Fetch read 3 pages; copy/download verified |
| Public npm registry install | Default `npm install tinyfish-convex` resolved 0.1.0 |
| Independent registry consumer, mounted as `fish` | Live round trip: 7 sources, 2 pages, zero failures, expected content present |
| Registry artifact identity | SHA-1 matches the tested release tarball |
| Local bridge boundary | Foreign Origin/Host, simple forms, oversized bodies and arbitrary function paths rejected |

The live acceptance suite exercised the actual component through Convex and TinyFish's real REST APIs. It checked official-source domain filtering, research-paper year bounds, Markdown extraction from three documentation pages, a JavaScript-rendered quote page and a PDF, mixed success/404 batches, HTML, JSON document trees, selectors, metadata, links and all-failure batches. The expanded suite verifies Chinese Unicode content, origin Last-Modified replay returning `not_modified: true` with null content, explicit `conditional_unsupported` page errors, and the complete research recipe. [Live report](LIVE-ACCEPTANCE-0.1.1.json).

Automated tests also cover authenticated host wrappers, API-key isolation, query encoding, option forwarding, conditional null results, additive/malformed provider responses, HTTP 401/402/403/429/500/503, non-JSON gateways, network failures, missing credentials and deadline cleanup, including stalled response bodies after headers arrive. The research recipe is tested for duplicate URLs, zero-result searches and partial failures.

The comparison records predetermined phrase presence and output character counts on five pages. Cache policies, tiers and call paths differ, so it makes no relative latency claim. It is not a comprehensive semantic-accuracy benchmark. See [EVALUATION.md](EVALUATION.md).

The real key was read from the user's authorized local TinyFish CLI configuration and sent to the local Convex environment over stdin. No key, local admin credential or private deployment state is included in the npm tarball or source archive.

To rerun the real acceptance cases after setting the deployment key: `npm run test:live`. To inspect the demo: `npm run demo -- --use-cli-key` (or use a securely supplied shell environment key).

The public registry verification reinstalled the package from a registry-resolved lockfile with a fresh npm cache in an independent Convex consumer, redeployed it under a custom component name, and ran real Search and Fetch. A separate default-version install also resolved 0.1.0. Machine-readable results: [RELEASE-VERIFICATION.json](RELEASE-VERIFICATION.json). The registry artifact SHA-1 is `2625a19e518d5a245529ffca38cae652fe412bba`.

Conditional reads have routing limits: the initial probe assumed an ETag would exist on a documentation page and a PDF, and failed that assumption. Direct REST and official documentation identified the fast-path restriction. The final acceptance uses the origin-provided Last-Modified on `example.com` and separately asserts the unsupported-path error. Missing validators do not mean content is unchanged.
