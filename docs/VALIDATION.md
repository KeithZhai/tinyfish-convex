# Validation record — October 14, 2026

The published 0.2.0 release passed the checks below. The public registry tarball is byte-for-byte identical to the tested candidate, and an independent project installed it through the ordinary npm command with a fresh cache.

| Check | Result |
| --- | --- |
| Package and example TypeScript checks | Passed |
| Vitest / convex-test / local bridge boundary tests | 95 passed |
| Vite production build | Passed |
| Official Convex component codegen | Passed |
| Local Convex component deployment | Passed with a real TinyFish key |
| Isolated tarball install and consumer types | Passed |
| Minimum Convex 1.42 consumer TypeScript check | Passed |
| Installed component test helper | Passed in an isolated consumer |
| Live Convex → TinyFish acceptance | 13/13 cases passed |
| Shared-source live extraction comparison | 12 paired extraction pages; Read and Firecrawl 51/51 literal checks; 7 paired search tasks |
| Real browser workflow | Domain-filtered Search returned 6 sources; Fetch read 3 pages; copy/download verified |
| Browser/Profile/Agent real acceptance | 10 passed: CDP clicks/close, saved public-sandbox login, API-confirmed Profile attachment, exact next-page quote/author match, persisted steps, deduplication and accepted-run cancellation |
| Fresh 0.2.0 tarball consumer | Custom mount `fish`, Search/Read, authenticated API factory, durable Agent, step/list pagination and recovery of an interrupted dispatch passed |
| Public npm registry install | Default `npm install tinyfish-convex` resolved 0.2.0 |
| Independent registry consumer, mounted as `fish` | Search/Read: 6 sources, 2 pages, zero failures; authenticated Agent completed with the expected title, 5 persisted steps, pagination and start deduplication |
| Registry artifact identity | SHA-1 matches the tested release tarball |
| Local bridge boundary | Foreign Origin/Host, simple forms, oversized bodies and arbitrary function paths rejected |

The live acceptance suite exercised the actual component through Convex and TinyFish's real REST APIs. It checked official-source domain filtering, research-paper year bounds, Markdown extraction from three documentation pages, a JavaScript-rendered quote page and a PDF, mixed success/404 batches, HTML, JSON document trees, selectors, metadata, links and all-failure batches. The expanded suite verifies Chinese Unicode content, origin Last-Modified replay returning `not_modified: true` with null content, explicit `conditional_unsupported` page errors, and the complete research recipe. [Live report](LIVE-ACCEPTANCE-0.2.0.json).

Automated tests also cover authenticated host wrappers, API-key isolation, query encoding, option forwarding, conditional null results, additive/malformed provider responses, HTTP 401/402/403/429/500/503, non-JSON gateways, network failures, missing credentials and deadline cleanup, including stalled response bodies after headers arrive. The research recipe is tested for duplicate URLs, zero-result searches and partial failures.

The comparison records 51 predetermined literal checks on 12 pages, TypeScript syntax diagnostics and seven expected-primary-source search targets. Cache policies, tiers and call paths differ, so it makes no relative latency claim. It is not a comprehensive semantic-accuracy benchmark. See [EVALUATION.md](EVALUATION.md).

The real key was read from the user's authorized local TinyFish CLI configuration and sent to the local Convex environment over stdin. No key, local admin credential or private deployment state is included in the npm tarball or source archive.

To rerun the real acceptance cases after setting the deployment key: `npm run test:live`. To inspect the demo: `npm run demo -- --use-cli-key` (or use a securely supplied shell environment key).

The public registry verification started a new independent Convex project, installed with the ordinary `npm install tinyfish-convex` command and a fresh npm cache, mounted the component as `fish`, deployed it, and ran real Search → Read plus an authenticated durable Agent with persisted steps and paginated job listing. Repeated starts with the same request key returned the same job. The lockfile resolves the registry tarball, and the downloaded registry bytes match the tested release artifact. Machine-readable results: [RELEASE-VERIFICATION.json](RELEASE-VERIFICATION.json). The registry artifact SHA-1 is `7af8e669a16d4f76a7a94e9ef48612e521ab4a7c`.

Conditional reads have routing limits: the initial probe assumed an ETag would exist on a documentation page and a PDF, and failed that assumption. Direct REST and official documentation identified the fast-path restriction. The final acceptance uses the origin-provided Last-Modified on `example.com` and separately asserts the unsupported-path error. Missing validators do not mean content is unchanged.

The new Read implementation was tested through the actual Convex runtime on all 12 paired extraction pages. Its frozen README snippet parsed with zero TypeScript syntax errors, and the long Node/Rust pages retained their literal checks while eliminating thousands of fragmented code blocks. A deliberately failed package compilation left the working component artifact unchanged. See the detailed limitations in EVALUATION.md.

Full capability evidence: [FULL-CAPABILITIES-0.2.0.json](FULL-CAPABILITIES-0.2.0.json). New Search/Fetch evidence: [LIVE-ACCEPTANCE-0.2.0.json](LIVE-ACCEPTANCE-0.2.0.json). The public login sandbox is not enterprise SSO/MFA coverage. Reactive polling delivers progress every few seconds, rather than streaming every agent event. Production quota policy and provider-account resource grants belong to the host. No overall superiority, directory acceptance or company maintenance commitment is inferred from these tests.

The independent full consumer initially exposed a scheduled action that failed before its handler started. A queue watchdog and safe resume now recover this stage before any provider POST; the regression suite cancels the initial scheduled dispatch and verifies exactly one later submission. The independent consumer recovered the persisted job and completed with its expected page heading. [Fresh consumer report](FRESH-CONSUMER-0.2.0.json).

The registry acceptance harness initially called `resume` while submission was still in flight; that operation correctly refused to resubmit without a run ID. The same job subsequently received its provider run ID. The corrected harness resumes only queued or paused jobs and completed with the original idempotency key, without creating a second provider run.
